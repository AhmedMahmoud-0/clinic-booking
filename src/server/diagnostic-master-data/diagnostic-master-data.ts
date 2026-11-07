import "server-only";

import type { Prisma } from "../../../generated/prisma/client";

import { getPrismaClient } from "../db/client";
import { ClinicMasterDataError } from "../clinic-master-data/errors";
import type {
  CreateLabTestComponentInput,
  CreateLabTestInput,
  CreateRadiologyProcedureInput,
  CreateRadiologyResourceInput,
  LabTestComponentPatchInput,
  LabTestPatchInput,
  RadiologyProcedurePatchInput,
  RadiologyResourcePatchInput,
} from "./validation";

type Transaction = Prisma.TransactionClient;

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function translateDiagnosticConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isPrismaCode(error, "P2002")) {
      throw new ClinicMasterDataError(
        "DIAGNOSTIC_CATALOG_CONFLICT",
        "A diagnostic catalog code already exists.",
        409,
      );
    }
    if (isPrismaCode(error, "P2025")) {
      throw new ClinicMasterDataError(
        "DIAGNOSTIC_CATALOG_NOT_FOUND",
        "The requested diagnostic catalog record was not found.",
        404,
      );
    }
    if (isPrismaCode(error, "P2003") || isPrismaCode(error, "P2014")) {
      throw new ClinicMasterDataError(
        "DIAGNOSTIC_CATALOG_RELATIONSHIP_CONFLICT",
        "The requested change conflicts with existing diagnostic records.",
        409,
      );
    }
    throw error;
  }
}

async function recordDiagnosticAudit(
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

/** Staff-only DTOs. Never returns orders, samples, result values, reports, or patient data. */
export async function getDiagnosticMasterData() {
  const prisma = getPrismaClient();
  const [labTests, radiologyProcedures, radiologyResources] = await Promise.all([
    prisma.labTest.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        specimenType: true,
        defaultTurnaroundMinutes: true,
        requiresFasting: true,
        preparationInstructions: true,
        price: true,
        currencyCode: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        components: {
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
          select: {
            id: true,
            code: true,
            name: true,
            valueType: true,
            defaultUnit: true,
            sortOrder: true,
            isActive: true,
          },
        },
        _count: { select: { orderItems: true } },
      },
    }),
    prisma.radiologyProcedure.findMany({
      orderBy: [{ modality: "asc" }, { isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        modality: true,
        description: true,
        defaultDurationMinutes: true,
        price: true,
        currencyCode: true,
        preparationInstructions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orderItems: true } },
      },
    }),
    prisma.radiologyResource.findMany({
      orderBy: [{ modality: "asc" }, { isActive: "desc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        modality: true,
        location: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            exams: { where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } } },
          },
        },
      },
    }),
  ]);

  return {
    labTests: labTests.map((test) => ({
      ...test,
      price: test.price.toFixed(2),
    })),
    radiologyProcedures: radiologyProcedures.map((procedure) => ({
      ...procedure,
      price: procedure.price.toFixed(2),
    })),
    radiologyResources,
  };
}

export async function createLabTest(input: CreateLabTestInput, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  return translateDiagnosticConflict(() =>
    prisma.$transaction(async (transaction) => {
      const created = await transaction.labTest.create({
        data: {
          code: input.code,
          name: input.name,
          description: input.description ?? null,
          specimenType: input.specimenType ?? null,
          defaultTurnaroundMinutes: input.defaultTurnaroundMinutes ?? null,
          requiresFasting: input.requiresFasting,
          preparationInstructions: input.preparationInstructions ?? null,
          price: input.price,
          currencyCode: "EGP",
        },
        select: {
          id: true,
          code: true,
          name: true,
          specimenType: true,
          defaultTurnaroundMinutes: true,
          requiresFasting: true,
          price: true,
          currencyCode: true,
          isActive: true,
          createdAt: true,
        },
      });
      await recordDiagnosticAudit(transaction, actorEmployeeId, "CLINIC_MASTER_DATA_CREATED", "LabTest", created.id, input.reason);
      return { ...created, price: created.price.toFixed(2) };
    }),
  );
}

export async function updateLabTest(
  labTestId: string,
  input: LabTestPatchInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateDiagnosticConflict(() =>
    prisma.$transaction(async (transaction) => {
      const existing = await transaction.labTest.findUnique({
        where: { id: labTestId },
        select: { id: true },
      });
      if (!existing) throw new ClinicMasterDataError("LAB_TEST_NOT_FOUND", "The laboratory test was not found.", 404);

      const { reason, ...data } = input;
      const updated = await transaction.labTest.update({
        where: { id: labTestId },
        data,
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          specimenType: true,
          defaultTurnaroundMinutes: true,
          requiresFasting: true,
          preparationInstructions: true,
          price: true,
          currencyCode: true,
          isActive: true,
          updatedAt: true,
        },
      });
      await recordDiagnosticAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_UPDATED",
        "LabTest",
        labTestId,
        `${reason}; changed=${Object.keys(data).join(",")}`,
      );
      return { ...updated, price: updated.price.toFixed(2) };
    }),
  );
}

export async function createLabTestComponent(
  labTestId: string,
  input: CreateLabTestComponentInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateDiagnosticConflict(() =>
    prisma.$transaction(async (transaction) => {
      const labTest = await transaction.labTest.findUnique({
        where: { id: labTestId },
        select: { id: true, isActive: true },
      });
      if (!labTest || !labTest.isActive) {
        throw new ClinicMasterDataError("ACTIVE_LAB_TEST_REQUIRED", "An active laboratory test is required.", 409);
      }
      const created = await transaction.labTestComponent.create({
        data: {
          labTestId,
          code: input.code,
          name: input.name,
          valueType: input.valueType,
          defaultUnit: input.defaultUnit ?? null,
          sortOrder: input.sortOrder,
        },
        select: {
          id: true,
          labTestId: true,
          code: true,
          name: true,
          valueType: true,
          defaultUnit: true,
          sortOrder: true,
          isActive: true,
        },
      });
      await recordDiagnosticAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_CREATED",
        "LabTestComponent",
        created.id,
        input.reason,
      );
      return created;
    }),
  );
}

export async function updateLabTestComponent(
  componentId: string,
  input: LabTestComponentPatchInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateDiagnosticConflict(() =>
    prisma.$transaction(async (transaction) => {
      const existing = await transaction.labTestComponent.findUnique({
        where: { id: componentId },
        select: { id: true },
      });
      if (!existing) {
        throw new ClinicMasterDataError("LAB_COMPONENT_NOT_FOUND", "The laboratory test component was not found.", 404);
      }
      const { reason, ...data } = input;
      const updated = await transaction.labTestComponent.update({
        where: { id: componentId },
        data,
        select: {
          id: true,
          labTestId: true,
          code: true,
          name: true,
          valueType: true,
          defaultUnit: true,
          sortOrder: true,
          isActive: true,
        },
      });
      await recordDiagnosticAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_UPDATED",
        "LabTestComponent",
        componentId,
        `${reason}; changed=${Object.keys(data).join(",")}`,
      );
      return updated;
    }),
  );
}

export async function createRadiologyProcedure(
  input: CreateRadiologyProcedureInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateDiagnosticConflict(() =>
    prisma.$transaction(async (transaction) => {
      const created = await transaction.radiologyProcedure.create({
        data: {
          code: input.code,
          name: input.name,
          modality: input.modality,
          description: input.description ?? null,
          defaultDurationMinutes: input.defaultDurationMinutes ?? null,
          price: input.price,
          currencyCode: "EGP",
          preparationInstructions: input.preparationInstructions ?? null,
        },
        select: {
          id: true,
          code: true,
          name: true,
          modality: true,
          description: true,
          defaultDurationMinutes: true,
          price: true,
          currencyCode: true,
          preparationInstructions: true,
          isActive: true,
          createdAt: true,
        },
      });
      await recordDiagnosticAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_CREATED",
        "RadiologyProcedure",
        created.id,
        input.reason,
      );
      return { ...created, price: created.price.toFixed(2) };
    }),
  );
}

export async function updateRadiologyProcedure(
  procedureId: string,
  input: RadiologyProcedurePatchInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateDiagnosticConflict(() =>
    prisma.$transaction(async (transaction) => {
      const existing = await transaction.radiologyProcedure.findUnique({
        where: { id: procedureId },
        select: { id: true },
      });
      if (!existing) {
        throw new ClinicMasterDataError("RADIOLOGY_PROCEDURE_NOT_FOUND", "The radiology procedure was not found.", 404);
      }
      const { reason, ...data } = input;
      const updated = await transaction.radiologyProcedure.update({
        where: { id: procedureId },
        data,
        select: {
          id: true,
          code: true,
          name: true,
          modality: true,
          description: true,
          defaultDurationMinutes: true,
          price: true,
          currencyCode: true,
          preparationInstructions: true,
          isActive: true,
          updatedAt: true,
        },
      });
      await recordDiagnosticAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_UPDATED",
        "RadiologyProcedure",
        procedureId,
        `${reason}; changed=${Object.keys(data).join(",")}`,
      );
      return { ...updated, price: updated.price.toFixed(2) };
    }),
  );
}

export async function createRadiologyResource(
  input: CreateRadiologyResourceInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateDiagnosticConflict(() =>
    prisma.$transaction(async (transaction) => {
      const created = await transaction.radiologyResource.create({
        data: {
          code: input.code,
          name: input.name,
          modality: input.modality,
          location: input.location ?? null,
        },
        select: {
          id: true,
          code: true,
          name: true,
          modality: true,
          location: true,
          isActive: true,
          createdAt: true,
        },
      });
      await recordDiagnosticAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_CREATED",
        "RadiologyResource",
        created.id,
        input.reason,
      );
      return created;
    }),
  );
}

export async function updateRadiologyResource(
  resourceId: string,
  input: RadiologyResourcePatchInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return translateDiagnosticConflict(() =>
    prisma.$transaction(async (transaction) => {
      const existing = await transaction.radiologyResource.findUnique({
        where: { id: resourceId },
        select: { id: true, isActive: true },
      });
      if (!existing) {
        throw new ClinicMasterDataError("RADIOLOGY_RESOURCE_NOT_FOUND", "The radiology resource was not found.", 404);
      }
      if (input.isActive === false && existing.isActive) {
        const activeExams = await transaction.radiologyExam.count({
          where: {
            resourceId,
            status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          },
        });
        if (activeExams > 0) {
          throw new ClinicMasterDataError(
            "RADIOLOGY_RESOURCE_HAS_ACTIVE_EXAMS",
            "A resource with scheduled or in-progress exams cannot be deactivated. Reassign or complete those exams first.",
            409,
          );
        }
      }
      const { reason, ...data } = input;
      const updated = await transaction.radiologyResource.update({
        where: { id: resourceId },
        data,
        select: {
          id: true,
          code: true,
          name: true,
          modality: true,
          location: true,
          isActive: true,
          updatedAt: true,
        },
      });
      await recordDiagnosticAudit(
        transaction,
        actorEmployeeId,
        "CLINIC_MASTER_DATA_UPDATED",
        "RadiologyResource",
        resourceId,
        `${reason}; changed=${Object.keys(data).join(",")}`,
      );
      return updated;
    }),
  );
}
