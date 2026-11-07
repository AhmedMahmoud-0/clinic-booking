import "server-only";

import type { Prisma } from "../../../generated/prisma/client";

import { getPrismaClient } from "../db/client";
import { ClinicMasterDataError } from "./errors";
import type {
  CreateServiceInput,
  DoctorProfilePatchInput,
  DoctorServiceUpsertInput,
  DoctorSpecialtyReplaceInput,
  ServicePatchInput,
  SpecialtyPatchInput,
} from "./master-data-validation";

type Transaction = Prisma.TransactionClient;

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function translateMasterDataConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isPrismaCode(error, "P2002")) {
      throw new ClinicMasterDataError(
        "MASTER_DATA_CONFLICT",
        "A record with the same unique code or name already exists.",
        409,
      );
    }
    if (isPrismaCode(error, "P2025")) {
      throw new ClinicMasterDataError(
        "MASTER_DATA_NOT_FOUND",
        "The requested clinic master-data record was not found.",
        404,
      );
    }
    if (isPrismaCode(error, "P2003") || isPrismaCode(error, "P2014")) {
      throw new ClinicMasterDataError(
        "MASTER_DATA_RELATIONSHIP_CONFLICT",
        "The requested change conflicts with an existing clinic relationship.",
        409,
      );
    }
    throw error;
  }
}

async function recordMasterDataAudit(
  transaction: Transaction,
  actorEmployeeId: string,
  action: "CLINIC_MASTER_DATA_CREATED" | "CLINIC_MASTER_DATA_UPDATED",
  entityType: string,
  entityId: string,
  reason: string,
): Promise<void> {
  await transaction.auditLog.create({
    data: {
      actorType: "EMPLOYEE",
      actorEmployeeId,
      action,
      entityType,
      entityId,
      reason: reason.slice(0, 500),
    },
  });
}

/** Staff-only master-data DTO. Employee contact details are intentionally omitted. */
export async function getClinicMasterData() {
  const prisma = getPrismaClient();
  const [specialties, doctors, services] = await Promise.all([
    prisma.specialty.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.doctorProfile.findMany({
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        professionalTitle: true,
        publicDisplayName: true,
        publicBio: true,
        yearsOfExperience: true,
        isBookable: true,
        isPubliclyVisible: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        specialties: {
          select: {
            isPrimary: true,
            specialty: { select: { id: true, code: true, name: true, isActive: true } },
          },
        },
        services: {
          select: {
            id: true,
            durationMinutes: true,
            price: true,
            currencyCode: true,
            isActive: true,
            service: { select: { id: true, code: true, name: true, type: true, isActive: true } },
          },
        },
      },
    }),
    prisma.serviceCatalog.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { doctors: true } },
      },
    }),
  ]);

  return {
    specialties,
    doctors: doctors
      .filter((doctor) => doctor.specialties.some(({ specialty }) => specialty.isActive))
      .map((doctor) => ({
      ...doctor,
      services: doctor.services.map((doctorService) => ({
        ...doctorService,
        price: doctorService.price.toFixed(2),
      })),
    })),
    services,
  };
}

/** Public-only directory; never returns employee IDs, numbers, email addresses, or phone numbers. */
export async function getPublicClinicCatalog() {
  const prisma = getPrismaClient();
  const [specialties, doctors] = await Promise.all([
    prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, description: true, sortOrder: true },
    }),
    prisma.doctorProfile.findMany({
      where: {
        isPubliclyVisible: true,
        publicDisplayName: { not: null },
        employee: { is: { status: "ACTIVE" } },
      },
      orderBy: [{ isBookable: "desc" }, { publicDisplayName: "asc" }],
      select: {
        id: true,
        professionalTitle: true,
        publicDisplayName: true,
        publicBio: true,
        yearsOfExperience: true,
        isBookable: true,
        specialties: {
          select: {
            isPrimary: true,
            specialty: { select: { id: true, code: true, name: true, description: true, isActive: true } },
          },
        },
        services: {
          select: {
            durationMinutes: true,
            price: true,
            currencyCode: true,
            isActive: true,
            service: { select: { id: true, code: true, name: true, type: true, isActive: true } },
          },
        },
      },
    }),
  ]);

  return {
    specialties,
    doctors: doctors
      .filter((doctor) => doctor.specialties.some(({ specialty }) => specialty.isActive))
      .map((doctor) => ({
      id: doctor.id,
      displayName: doctor.publicDisplayName,
      professionalTitle: doctor.professionalTitle,
      bio: doctor.publicBio,
      yearsOfExperience: doctor.yearsOfExperience,
      isBookable: doctor.isBookable,
      specialties: doctor.specialties
        .filter(({ specialty }) => specialty.isActive)
        .map(({ isPrimary, specialty }) => ({
          id: specialty.id,
          code: specialty.code,
          name: specialty.name,
          description: specialty.description,
          isPrimary,
        })),
      services: doctor.services
        .filter((doctorService) => doctorService.isActive && doctorService.service.isActive)
        .map((doctorService) => ({
          serviceId: doctorService.service.id,
          code: doctorService.service.code,
          name: doctorService.service.name,
          type: doctorService.service.type,
          durationMinutes: doctorService.durationMinutes,
          price: doctorService.price.toFixed(2),
          currencyCode: doctorService.currencyCode,
        })),
    })),
  };
}

export async function updateSpecialty(
  specialtyId: string,
  input: SpecialtyPatchInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateMasterDataConflict(() =>
    prisma.$transaction(async (transaction) => {
      const existing = await transaction.specialty.findUnique({
        where: { id: specialtyId },
        select: { id: true, isActive: true },
      });
      if (!existing) {
        throw new ClinicMasterDataError("SPECIALTY_NOT_FOUND", "The specialty was not found.", 404);
      }

      if (input.isActive === false && existing.isActive) {
        const assignments = await transaction.doctorSpecialty.findMany({
          where: { specialtyId },
          select: { doctor: { select: { isBookable: true, employee: { select: { status: true } } } } },
        });
        const hasBookableDoctor = assignments.some(
          ({ doctor }) => doctor.isBookable && doctor.employee.status === "ACTIVE",
        );
        if (hasBookableDoctor) {
          throw new ClinicMasterDataError(
            "SPECIALTY_HAS_BOOKABLE_DOCTORS",
            "A specialty assigned to an active bookable doctor cannot be deactivated. Update the doctor's profile or specialty assignment first.",
            409,
          );
        }
      }

      const { reason, ...data } = input;
      const updated = await transaction.specialty.update({
        where: { id: specialtyId },
        data,
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          sortOrder: true,
          isActive: true,
          updatedAt: true,
        },
      });
      await recordMasterDataAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_UPDATED",
        "Specialty",
        specialtyId,
        `${reason}; changed=${Object.keys(data).join(",")}`,
      );
      return updated;
    }),
  );
}

export async function updateDoctorProfile(
  doctorId: string,
  input: DoctorProfilePatchInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateMasterDataConflict(() =>
    prisma.$transaction(async (transaction) => {
      const existing = await transaction.doctorProfile.findUnique({
        where: { id: doctorId },
        select: { id: true, employee: { select: { status: true } } },
      });
      if (!existing) {
        throw new ClinicMasterDataError("DOCTOR_NOT_FOUND", "The doctor profile was not found.", 404);
      }

      if (input.isBookable === true) {
        if (existing.employee.status !== "ACTIVE") {
          throw new ClinicMasterDataError(
            "DOCTOR_EMPLOYEE_NOT_ACTIVE",
            "Only an active employee can have a bookable doctor profile.",
            409,
          );
        }

        const [specialtyAssignments, doctorServices] = await Promise.all([
          transaction.doctorSpecialty.findMany({
            where: { doctorId },
            select: { specialty: { select: { isActive: true } } },
          }),
          transaction.doctorService.findMany({
            where: { doctorId, isActive: true },
            select: { service: { select: { isActive: true } } },
          }),
        ]);
        if (!specialtyAssignments.some(({ specialty }) => specialty.isActive)) {
          throw new ClinicMasterDataError(
            "ACTIVE_DOCTOR_SPECIALTY_REQUIRED",
            "A bookable doctor must have at least one active specialty assignment.",
            409,
          );
        }
        if (!doctorServices.some(({ service }) => service.isActive)) {
          throw new ClinicMasterDataError(
            "ACTIVE_DOCTOR_SERVICE_REQUIRED",
            "A bookable doctor must have at least one active doctor-service offering.",
            409,
          );
        }
      }

      const { reason, ...data } = input;
      const updated = await transaction.doctorProfile.update({
        where: { id: doctorId },
        data,
        select: {
          id: true,
          professionalTitle: true,
          publicDisplayName: true,
          publicBio: true,
          yearsOfExperience: true,
          isBookable: true,
          isPubliclyVisible: true,
          updatedAt: true,
        },
      });
      await recordMasterDataAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_UPDATED",
        "DoctorProfile",
        doctorId,
        `${reason}; changed=${Object.keys(data).join(",")}`,
      );
      return updated;
    }),
  );
}

export async function replaceDoctorSpecialties(
  doctorId: string,
  input: DoctorSpecialtyReplaceInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateMasterDataConflict(() =>
    prisma.$transaction(async (transaction) => {
      const doctor = await transaction.doctorProfile.findUnique({
        where: { id: doctorId },
        select: { id: true },
      });
      if (!doctor) {
        throw new ClinicMasterDataError("DOCTOR_NOT_FOUND", "The doctor profile was not found.", 404);
      }

      const activeSpecialties = await transaction.specialty.findMany({
        where: { id: { in: input.specialtyIds }, isActive: true },
        select: { id: true },
      });
      if (activeSpecialties.length !== input.specialtyIds.length) {
        throw new ClinicMasterDataError(
          "ACTIVE_SPECIALTIES_REQUIRED",
          "Every assigned specialty must exist and be active.",
          409,
        );
      }

      await transaction.doctorSpecialty.deleteMany({ where: { doctorId } });
      await transaction.doctorSpecialty.createMany({
        data: input.specialtyIds.map((specialtyId) => ({
          doctorId,
          specialtyId,
          isPrimary: specialtyId === input.primarySpecialtyId,
        })),
      });
      await recordMasterDataAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_UPDATED",
        "DoctorSpecialty",
        doctorId,
        `${input.reason}; specialtyIds=${input.specialtyIds.join(",")}; primary=${input.primarySpecialtyId}`,
      );

      return {
        doctorId,
        specialtyIds: input.specialtyIds,
        primarySpecialtyId: input.primarySpecialtyId,
      };
    }),
  );
}

export async function createCatalogService(
  input: CreateServiceInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateMasterDataConflict(() =>
    prisma.$transaction(async (transaction) => {
      const created = await transaction.serviceCatalog.create({
        data: {
          code: input.code,
          name: input.name,
          type: input.type,
          description: input.description ?? null,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
          createdAt: true,
        },
      });
      await recordMasterDataAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_CREATED",
        "ServiceCatalog",
        created.id,
        input.reason,
      );
      return created;
    }),
  );
}

export async function updateCatalogService(
  serviceId: string,
  input: ServicePatchInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateMasterDataConflict(() =>
    prisma.$transaction(async (transaction) => {
      const existing = await transaction.serviceCatalog.findUnique({
        where: { id: serviceId },
        select: { id: true },
      });
      if (!existing) {
        throw new ClinicMasterDataError("SERVICE_NOT_FOUND", "The clinic service was not found.", 404);
      }

      const { reason, ...data } = input;
      const updated = await transaction.serviceCatalog.update({
        where: { id: serviceId },
        data,
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
          updatedAt: true,
        },
      });
      await recordMasterDataAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_UPDATED",
        "ServiceCatalog",
        serviceId,
        `${reason}; changed=${Object.keys(data).join(",")}`,
      );
      return updated;
    }),
  );
}

export async function upsertDoctorService(
  input: DoctorServiceUpsertInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateMasterDataConflict(() =>
    prisma.$transaction(async (transaction) => {
      const [doctor, service, previous] = await Promise.all([
        transaction.doctorProfile.findUnique({
          where: { id: input.doctorId },
          select: { id: true, isBookable: true, employee: { select: { status: true } } },
        }),
        transaction.serviceCatalog.findUnique({
          where: { id: input.serviceId },
          select: { id: true, name: true, isActive: true },
        }),
        transaction.doctorService.findUnique({
          where: { doctorId_serviceId: { doctorId: input.doctorId, serviceId: input.serviceId } },
          select: { price: true, durationMinutes: true },
        }),
      ]);

      if (!doctor || doctor.employee.status !== "ACTIVE") {
        throw new ClinicMasterDataError(
          "ACTIVE_DOCTOR_REQUIRED",
          "The service can be assigned only to an existing doctor with an active employee record.",
          409,
        );
      }
      if (!service || !service.isActive) {
        throw new ClinicMasterDataError(
          "ACTIVE_SERVICE_REQUIRED",
          "The doctor-service offering requires an existing active service.",
          409,
        );
      }

      const result = await transaction.doctorService.upsert({
        where: { doctorId_serviceId: { doctorId: input.doctorId, serviceId: input.serviceId } },
        create: {
          doctorId: input.doctorId,
          serviceId: input.serviceId,
          durationMinutes: input.durationMinutes,
          price: input.price,
          currencyCode: "EGP",
          isActive: true,
        },
        update: {
          durationMinutes: input.durationMinutes,
          price: input.price,
          currencyCode: "EGP",
          isActive: true,
        },
        select: {
          id: true,
          doctorId: true,
          serviceId: true,
          durationMinutes: true,
          price: true,
          currencyCode: true,
          isActive: true,
          updatedAt: true,
        },
      });

      const previousAmount = previous?.price.toFixed(2) ?? "not set";
      await recordMasterDataAudit(
        transaction,
        actorEmployeeId,
        previous ? "CLINIC_MASTER_DATA_UPDATED" : "CLINIC_MASTER_DATA_CREATED",
        "DoctorService",
        result.id,
        `${input.reason}; service=${service.name}; previousPriceEGP=${previousAmount}; priceEGP=${result.price.toFixed(2)}; durationMinutes=${result.durationMinutes}`,
      );

      return { ...result, price: result.price.toFixed(2) };
    }),
  );
}
