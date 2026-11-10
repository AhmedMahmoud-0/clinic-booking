import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import type { DoctorReferralRequest } from "./doctor-referral-validation";
import {
  decideDoctorReferralEncounterAccess,
  decideDoctorReferralTarget,
} from "./doctor-referral-policy";

export class DoctorReferralError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DoctorReferralError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function referralError(code: string, message: string, status: number): never {
  throw new DoctorReferralError(code, message, status);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

const employeeSelect = {
  id: true,
  status: true,
  roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } },
  doctorProfile: { select: { id: true } },
} satisfies Prisma.EmployeeSelect;

type EmployeeSource = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;

const encounterSelect = {
  id: true,
  patientId: true,
  doctorId: true,
  appointmentId: true,
  queueEntryId: true,
  status: true,
  completedAt: true,
  appointment: {
    select: { id: true, patientId: true, doctorId: true, status: true },
  },
  queueEntry: {
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      appointmentId: true,
      type: true,
      status: true,
      serviceStartedAt: true,
    },
  },
} satisfies Prisma.EncounterSelect;

type EncounterSource = Prisma.EncounterGetPayload<{ select: typeof encounterSelect }>;

const referralSelect = {
  id: true,
  type: true,
  status: true,
  externalFacilityName: true,
  externalContact: true,
  reason: true,
  instructions: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  referredToSpecialty: {
    select: { id: true, code: true, name: true },
  },
  referredToDoctor: {
    select: {
      id: true,
      publicDisplayName: true,
      professionalTitle: true,
      employee: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.ReferralSelect;

type ReferralSource = Prisma.ReferralGetPayload<{ select: typeof referralSelect }>;

function isConsistentEncounterOrigin(encounter: EncounterSource): boolean {
  if (encounter.appointmentId !== null && encounter.queueEntryId === null) {
    return encounter.appointment !== null
      && encounter.appointment.id === encounter.appointmentId
      && encounter.appointment.patientId === encounter.patientId
      && encounter.appointment.doctorId === encounter.doctorId
      && encounter.appointment.status === "IN_CONSULTATION"
      && encounter.queueEntry === null;
  }
  if (encounter.appointmentId === null && encounter.queueEntryId !== null) {
    return encounter.appointment === null
      && encounter.queueEntry !== null
      && encounter.queueEntry.id === encounter.queueEntryId
      && encounter.queueEntry.patientId === encounter.patientId
      && encounter.queueEntry.doctorId === encounter.doctorId
      && encounter.queueEntry.appointmentId === null
      && encounter.queueEntry.type === "WALK_IN"
      && encounter.queueEntry.status === "IN_SERVICE"
      && encounter.queueEntry.serviceStartedAt !== null;
  }
  return false;
}

function mapPolicyRejection(code: string): never {
  const errors: Record<string, { message: string; status: number }> = {
    DOCTOR_WORKSPACE_ACCESS_REQUIRED: {
      message: "An active Doctor employee assignment is required for this operation.",
      status: 403,
    },
    DOCTOR_PROFILE_REQUIRED: {
      message: "The active Doctor employee does not have a linked Doctor profile.",
      status: 403,
    },
    ENCOUNTER_NOT_FOUND: {
      message: "The Encounter was not found for the authenticated Doctor.",
      status: 404,
    },
    ENCOUNTER_NOT_EDITABLE: {
      message: "Only an active in-progress Encounter can accept a referral.",
      status: 409,
    },
    ENCOUNTER_SOURCE_INCONSISTENT: {
      message: "The Encounter visit source is inconsistent. Contact the clinic administrator.",
      status: 409,
    },
    REFERRAL_TARGET_INVALID: {
      message: "The referral target does not match the selected referral type.",
      status: 400,
    },
    REFERRAL_SPECIALTY_NOT_AVAILABLE: {
      message: "The selected referral specialty is unavailable or inactive.",
      status: 404,
    },
    REFERRAL_DOCTOR_NOT_AVAILABLE: {
      message: "The selected referral Doctor is unavailable or inactive.",
      status: 404,
    },
    REFERRAL_DOCTOR_SPECIALTY_MISMATCH: {
      message: "The selected Doctor is not assigned to the selected specialty.",
      status: 400,
    },
  };
  const error = errors[code] ?? { message: "The referral operation could not be completed.", status: 409 };
  referralError(code, error.message, error.status);
}

async function resolveDoctor(
  transaction: Transaction,
  actorEmployeeId: string,
): Promise<EmployeeSource> {
  const employee = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: employeeSelect,
  });
  if (
    !employee
    || employee.status !== "ACTIVE"
    || !employee.roleAssignments.some((assignment) => assignment.role === "DOCTOR")
  ) {
    mapPolicyRejection("DOCTOR_WORKSPACE_ACCESS_REQUIRED");
  }
  if (!employee.doctorProfile) mapPolicyRejection("DOCTOR_PROFILE_REQUIRED");
  return employee;
}

async function resolveDoctorEncounter(
  transaction: Transaction,
  encounterId: string,
  actorEmployeeId: string,
  lock: boolean,
): Promise<{ employee: EmployeeSource; encounter: EncounterSource }> {
  await resolveDoctor(transaction, actorEmployeeId);

  if (lock) {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE
    `;
    if (locked.length !== 1) mapPolicyRejection("ENCOUNTER_NOT_FOUND");
  }

  // Re-resolve active employee status, Doctor role, and profile after locking the Encounter.
  const employee = await resolveDoctor(transaction, actorEmployeeId);
  const encounter = await transaction.encounter.findUnique({
    where: { id: encounterId },
    select: encounterSelect,
  });
  const decision = decideDoctorReferralEncounterAccess({
    employeeStatus: employee.status,
    activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
    doctorProfileId: employee.doctorProfile?.id ?? null,
    encounterExists: encounter !== null,
    encounterDoctorId: encounter?.doctorId ?? null,
    encounterStatus: encounter?.status ?? null,
    encounterCompletedAtExists: encounter?.completedAt !== null && encounter?.completedAt !== undefined,
    encounterOriginIsConsistent: encounter ? isConsistentEncounterOrigin(encounter) : false,
  });
  if (decision.kind === "REJECT") mapPolicyRejection(decision.code);
  if (!encounter) mapPolicyRejection("ENCOUNTER_NOT_FOUND");
  return { employee, encounter };
}

function toDoctorDisplayName(doctor: ReferralSource["referredToDoctor"]): string | null {
  if (!doctor) return null;
  const publicName = doctor.publicDisplayName?.trim();
  if (publicName) return publicName;
  return `${doctor.employee.firstName} ${doctor.employee.lastName}`.trim();
}

function toReferralDto(referral: ReferralSource) {
  const doctor = referral.referredToDoctor;
  return {
    id: referral.id,
    type: referral.type,
    status: referral.status,
    target: referral.type === "INTERNAL"
      ? {
          specialty: referral.referredToSpecialty,
          doctor: doctor
            ? {
                id: doctor.id,
                displayName: toDoctorDisplayName(doctor),
                professionalTitle: doctor.professionalTitle,
              }
            : null,
        }
      : {
          facilityName: referral.externalFacilityName,
          contact: referral.externalContact,
        },
    reason: referral.reason,
    instructions: referral.instructions,
    createdAt: referral.createdAt.toISOString(),
    updatedAt: referral.updatedAt.toISOString(),
    completedAt: referral.completedAt?.toISOString() ?? null,
  };
}

async function validateReferralTarget(transaction: Transaction, input: DoctorReferralRequest): Promise<void> {
  const specialtyId = input.referredToSpecialtyId ?? null;
  const doctorId = input.referredToDoctorId ?? null;
  const externalFacilityName = input.externalFacilityName ?? null;
  const externalContact = input.externalContact ?? null;

  const specialties = specialtyId
    ? await transaction.specialty.findMany({
        where: { id: specialtyId, isActive: true },
        select: { id: true },
      })
    : [];
  const doctors = doctorId
    ? await transaction.doctorProfile.findMany({
        where: {
          id: doctorId,
          employee: {
            is: {
              status: "ACTIVE",
              roleAssignments: { some: { status: "ACTIVE", role: "DOCTOR" } },
            },
          },
        },
        select: {
          id: true,
          specialties: { select: { specialtyId: true } },
        },
      })
    : [];

  const decision = decideDoctorReferralTarget({
    type: input.type,
    referredToSpecialtyId: specialtyId,
    referredToDoctorId: doctorId,
    externalFacilityName,
    externalContact,
    availableSpecialtyIds: specialties.map((specialty) => specialty.id),
    availableDoctors: doctors.map((doctor) => ({
      id: doctor.id,
      specialtyIds: doctor.specialties.map((specialty) => specialty.specialtyId),
    })),
  });
  if (decision.kind === "REJECT") mapPolicyRejection(decision.code);
}

/** Read referrals attached only to the authenticated Doctor's own active Encounter. */
export async function getDoctorEncounterReferrals(encounterId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    const { encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId, false);
    const referrals = await transaction.referral.findMany({
      where: { encounterId: encounter.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: referralSelect,
    });
    return {
      encounter: { id: encounter.id, status: encounter.status },
      referrals: referrals.map(toReferralDto),
    };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 10_000 });
}

/** Create a PENDING internal or external referral using only server-verified targets. */
export async function createDoctorReferral(
  encounterId: string,
  actorEmployeeId: string,
  input: DoctorReferralRequest,
) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const { employee, encounter } = await resolveDoctorEncounter(
        transaction,
        encounterId,
        actorEmployeeId,
        true,
      );
      await validateReferralTarget(transaction, input);

      const created = await transaction.referral.create({
        data: {
          encounterId: encounter.id,
          type: input.type,
          status: "PENDING",
          referredToSpecialtyId: input.referredToSpecialtyId ?? null,
          referredToDoctorId: input.referredToDoctorId ?? null,
          externalFacilityName: input.externalFacilityName ?? null,
          externalContact: input.externalContact ?? null,
          reason: input.reason,
          instructions: input.instructions?.trim() || null,
          createdByEmployeeId: employee.id,
        },
        select: referralSelect,
      });

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          action: "DOCTOR_REFERRAL_CREATED",
          entityType: "Referral",
          entityId: created.id,
          reason: `Doctor created ${created.type.toLowerCase()} referral for Encounter ${encounter.id}; targetKind=${created.type === "EXTERNAL" ? "EXTERNAL_FACILITY" : created.referredToDoctor && created.referredToSpecialty ? "DOCTOR_AND_SPECIALTY" : created.referredToDoctor ? "DOCTOR" : "SPECIALTY"}. Referral reason and external contact details are not copied into the audit log.`,
          occurredAt: new Date(),
        },
      });

      return {
        outcome: "CREATED" as const,
        encounter: { id: encounter.id, status: encounter.status },
        referral: toReferralDto(created),
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorReferralError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002") || isPrismaCode(error, "P2003")) {
      referralError(
        "DOCTOR_REFERRAL_CONCURRENT_CHANGE",
        "The Encounter or referral target changed concurrently. Refresh and try again.",
        409,
      );
    }
    throw error;
  }
}
