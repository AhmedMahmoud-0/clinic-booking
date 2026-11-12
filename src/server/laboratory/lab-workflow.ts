import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import type { LabResultDraftRequest, LabSampleCollectionRequest, LabSampleTransitionRequest } from "./lab-workflow-validation";
import {
  decideLabCollection,
  decideLabProcessing,
  decideLabResultDraft,
  decideLabSampleTransition,
  decideLabWorkspaceAccess,
} from "./lab-workflow-policy";
import { verifyPatientIdentityMatch, type PatientIdentityVerificationRecord } from "../patient-management/identity-verification-validation";

export class LabWorkflowError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "LabWorkflowError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function labError(code: string, message: string, status: number): never {
  throw new LabWorkflowError(code, message, status);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

const employeeSelect = {
  id: true,
  status: true,
  roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } },
} satisfies Prisma.EmployeeSelect;

type EmployeeSource = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;

async function resolveLabEmployee(transaction: Transaction, employeeId: string): Promise<EmployeeSource> {
  const employee = await transaction.employee.findUnique({ where: { id: employeeId }, select: employeeSelect });
  const decision = decideLabWorkspaceAccess({
    employeeStatus: employee?.status ?? "INACTIVE",
    activeRoles: employee?.roleAssignments.map((assignment) => assignment.role) ?? [],
  });
  if (decision.kind === "REJECT") {
    labError("LAB_WORKSPACE_ACCESS_REQUIRED", "An active Lab Staff employee assignment is required.", 403);
  }
  if (!employee) labError("LAB_WORKSPACE_ACCESS_REQUIRED", "An active Lab Staff employee assignment is required.", 403);
  return employee;
}

async function lockRow(transaction: Transaction, table: "LabOrderItem" | "LabSample", id: string): Promise<void> {
  const rows = table === "LabOrderItem"
    ? await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "LabOrderItem" WHERE "id" = ${id} FOR UPDATE`
    : await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "LabSample" WHERE "id" = ${id} FOR UPDATE`;
  if (rows.length !== 1) {
    labError(table === "LabSample" ? "LAB_SAMPLE_NOT_FOUND" : "LAB_ORDER_ITEM_NOT_FOUND", "The requested laboratory record was not found.", 404);
  }
}

function createSampleNumber(): string {
  return `SMP-${randomBytes(12).toString("hex").toUpperCase()}`;
}

async function createAudit(
  transaction: Transaction,
  input: { employeeId: string; action: string; entityType: string; entityId: string; reason?: string | null },
): Promise<void> {
  await transaction.auditLog.create({
    data: {
      actorType: "EMPLOYEE",
      actorEmployeeId: input.employeeId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason ?? null,
    },
  });
}

const labWorklistSelect = {
  id: true,
  orderReference: true,
  status: true,
  priority: true,
  orderedAt: true,
  items: {
    where: { status: { in: ["PENDING", "COLLECTED", "RECEIVED", "REJECTED", "PROCESSING"] } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      status: true,
      collectionNotes: true,
      collectedAt: true,
      receivedAt: true,
      processedAt: true,
      labTest: { select: { code: true, name: true, specimenType: true, requiresFasting: true, preparationInstructions: true } },
      sampleAssignments: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { sample: { select: { id: true, sampleNumber: true, status: true, specimenTypeSnapshot: true, collectedAt: true, receivedAt: true, rejectionReason: true } } },
      },
      result: { select: { id: true, status: true, resultedAt: true } },
    },
  },
  encounter: {
    select: {
      id: true,
      patient: { select: { id: true, mrn: true, recordType: true, firstName: true, lastName: true, isActive: true } },
    },
  },
  externalIntake: {
    select: {
      id: true,
      intakeReference: true,
      patient: { select: { id: true, mrn: true, recordType: true, firstName: true, lastName: true, isActive: true } },
      requestSource: true, referringProviderName: true, referringFacilityName: true, externalRequestReference: true, requestNotes: true,
    },
  },
} satisfies Prisma.LabOrderSelect;

type LabWorklistOrder = Prisma.LabOrderGetPayload<{ select: typeof labWorklistSelect }>;

export async function getLabWorklist(employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (transaction) => {
    await resolveLabEmployee(transaction, employeeId);
  });

  const orders = await prisma.labOrder.findMany({
    where: {
      status: { in: ["ORDERED", "IN_PROGRESS"] },
      items: { some: { status: { in: ["PENDING", "COLLECTED", "RECEIVED", "REJECTED", "PROCESSING"] } } },
    },
    orderBy: [{ orderedAt: "asc" }, { id: "asc" }],
    take: 100,
    select: labWorklistSelect,
  });

  return {
    items: orders
      .map((order: LabWorklistOrder) => {
        const patient = order.encounter?.patient ?? order.externalIntake?.patient;
        if (!patient) return null;
        return {
        id: order.id,
        orderReference: order.orderReference,
        status: order.status,
        priority: order.priority,
        orderedAt: order.orderedAt.toISOString(),
        intakeReference: order.externalIntake?.intakeReference ?? null,
        origin: order.externalIntake ? "EXTERNAL_INTAKE" as const : "CLINIC_ENCOUNTER" as const,
        patient: {
          id: patient.id,
          mrn: patient.mrn,
          displayName: `${patient.firstName} ${patient.lastName}`,
          isActive: patient.isActive,
          recordType: patient.recordType,
        },
        externalIntake: order.externalIntake ? {
          reference: order.externalIntake.intakeReference, requestSource: order.externalIntake.requestSource,
          referringProviderName: order.externalIntake.referringProviderName, referringFacilityName: order.externalIntake.referringFacilityName,
          externalRequestReference: order.externalIntake.externalRequestReference, requestNotes: order.externalIntake.requestNotes,
        } : null,
        orderItems: order.items.map((item) => ({
          id: item.id,
          status: item.status,
          test: item.labTest,
          collectionNotes: item.collectionNotes,
          collectedAt: item.collectedAt?.toISOString() ?? null,
          receivedAt: item.receivedAt?.toISOString() ?? null,
          processedAt: item.processedAt?.toISOString() ?? null,
          latestSample: item.sampleAssignments[0]?.sample
            ? {
                id: item.sampleAssignments[0].sample.id,
                sampleNumber: item.sampleAssignments[0].sample.sampleNumber,
                status: item.sampleAssignments[0].sample.status,
                specimenType: item.sampleAssignments[0].sample.specimenTypeSnapshot,
                collectedAt: item.sampleAssignments[0].sample.collectedAt.toISOString(),
                receivedAt: item.sampleAssignments[0].sample.receivedAt?.toISOString() ?? null,
                rejectionReason: item.sampleAssignments[0].sample.rejectionReason,
              }
            : null,
          result: item.result
            ? { id: item.result.id, status: item.result.status, resultedAt: item.result.resultedAt.toISOString() }
            : null,
        })),
      };
      })
      .filter((order): order is NonNullable<typeof order> => order !== null)
      .sort((left, right) => {
        if (left.priority !== right.priority) return left.priority === "URGENT" ? -1 : 1;
        return left.orderedAt.localeCompare(right.orderedAt);
      }),
    limit: 100,
  };
}

// LabOrderItem does not own Encounter directly; its order does. This payload is
// declared separately so the patient identity source is always the linked visit.
const collectionItemSelect = {
  id: true,
  status: true,
  collectionNotes: true,
  labTest: { select: { specimenType: true } },
  sampleAssignments: {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: { sample: { select: { status: true } } },
  },
  // Patient identity is resolved from a clinic Encounter or a diagnostic-only external intake.
  labOrder: {
    select: {
      id: true,
      status: true,
      encounter: {
        select: {
          id: true,
          appointmentId: true,
          patient: {
            select: {
              id: true,
              mrn: true,
              firstName: true,
              middleName: true,
              lastName: true,
              dateOfBirth: true,
              isActive: true,
              contacts: { where: { type: "PHONE", isActive: true }, select: { normalizedValue: true } },
            },
          },
        },
      },
      externalIntake: {
        select: {
          id: true,
          patient: {
            select: {
              id: true, mrn: true, firstName: true, middleName: true, lastName: true, dateOfBirth: true, isActive: true,
              contacts: { where: { type: "PHONE", isActive: true }, select: { normalizedValue: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.LabOrderItemSelect;

function identityMatches(request: LabSampleCollectionRequest, patient: PatientIdentityVerificationRecord): boolean {
  return verifyPatientIdentityMatch(patient, request.identityVerification);
}

export async function collectLabSample(orderItemId: string, employeeId: string, request: LabSampleCollectionRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    await resolveLabEmployee(transaction, employeeId);
    await lockRow(transaction, "LabOrderItem", orderItemId);
    const item = await transaction.labOrderItem.findUnique({ where: { id: orderItemId }, select: collectionItemSelect });
    if (!item) labError("LAB_ORDER_ITEM_NOT_FOUND", "The laboratory order item was not found.", 404);
    const encounter = item.labOrder.encounter;
    const patient = encounter?.patient ?? item.labOrder.externalIntake?.patient;
    if (!patient) labError("LAB_ORDER_PATIENT_NOT_FOUND", "The laboratory order has no linked patient record.", 409);
    const latestSampleStatus = item.sampleAssignments[0]?.sample.status ?? null;
    const eligibility = decideLabCollection({
      orderStatus: item.labOrder.status,
      itemStatus: item.status,
      patientIsActive: patient.isActive,
      latestSampleStatus,
    });
    if (eligibility.kind === "REJECT") {
      const messages: Record<string, { message: string; status: number }> = {
        LAB_ORDER_NOT_PROCESSABLE: { message: "The laboratory order is not available for collection.", status: 409 },
        LAB_ORDER_ITEM_NOT_COLLECTABLE: { message: "This test item already has an active or non-rejected sample.", status: 409 },
      };
      const error = messages[eligibility.code];
      labError(eligibility.code, error.message, error.status);
    }

    const now = new Date();
    const verified = identityMatches(request, patient);
    const verification = await transaction.identityVerification.create({
      data: {
        patientId: patient.id,
        appointmentId: encounter?.appointmentId ?? null,
        encounterId: encounter?.id ?? null,
        firstElement: request.identityVerification.firstIdentifier.type,
        secondElement: request.identityVerification.secondIdentifier.type,
        result: verified ? "VERIFIED" : "FAILED",
        performedByEmployeeId: employeeId,
        verifiedAt: now,
        notes: "Two distinct stored patient identity elements were compared. Submitted values are not retained.",
      },
      select: { id: true },
    });

    if (!verified) {
      await createAudit(transaction, {
        employeeId,
        action: "PATIENT_IDENTITY_VERIFICATION_FAILED",
        entityType: "IdentityVerification",
        entityId: verification.id,
        reason: "The two submitted patient identity elements did not both match. Submitted values were not retained.",
      });
      return { identityVerified: false as const, sample: null };
    }

    await createAudit(transaction, {
      employeeId,
      action: "PATIENT_IDENTITY_VERIFIED",
      entityType: "IdentityVerification",
      entityId: verification.id,
      reason: "Two distinct stored patient identity elements matched. Submitted values were not retained.",
    });
    const sample = await transaction.labSample.create({
      data: {
        sampleNumber: createSampleNumber(),
        specimenTypeSnapshot: item.labTest.specimenType,
        status: "COLLECTED",
        collectedByEmployeeId: employeeId,
        collectedAt: now,
        notes: request.collectionNotes ?? null,
        items: { create: { orderItemId } },
      },
      select: { id: true, sampleNumber: true, specimenTypeSnapshot: true, status: true, collectedAt: true },
    });
    await transaction.labOrderItem.update({
      where: { id: orderItemId },
      data: {
        status: "COLLECTED",
        collectionNotes: request.collectionNotes ?? null,
        collectedAt: now,
        receivedAt: null,
        processedAt: null,
      },
    });
    if (item.labOrder.status === "ORDERED") {
      await transaction.labOrder.update({ where: { id: item.labOrder.id }, data: { status: "IN_PROGRESS" } });
    }
    await createAudit(transaction, {
      employeeId,
      action: "LAB_SAMPLE_COLLECTED",
      entityType: "LabSample",
      entityId: sample.id,
    });
    return {
      identityVerified: true as const,
      sample: {
        id: sample.id,
        sampleNumber: sample.sampleNumber,
        specimenType: sample.specimenTypeSnapshot,
        status: sample.status,
        collectedAt: sample.collectedAt.toISOString(),
      },
    };
  }, { isolationLevel: "Serializable" });
}

const sampleForTransitionSelect = {
  id: true,
  sampleNumber: true,
  status: true,
  items: { select: { orderItemId: true } },
} satisfies Prisma.LabSampleSelect;

export async function transitionLabSample(sampleId: string, employeeId: string, request: LabSampleTransitionRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    await resolveLabEmployee(transaction, employeeId);
    await lockRow(transaction, "LabSample", sampleId);
    const sample = await transaction.labSample.findUnique({ where: { id: sampleId }, select: sampleForTransitionSelect });
    if (!sample) labError("LAB_SAMPLE_NOT_FOUND", "The laboratory sample was not found.", 404);
    const decision = decideLabSampleTransition({
      currentStatus: sample.status,
      action: request.action,
      rejectionReason: request.action === "REJECT" ? request.reason : null,
    });
    if (decision.kind === "REJECT") {
      labError(
        decision.code,
        decision.code === "LAB_SAMPLE_REJECTION_REASON_REQUIRED"
          ? "A reason is required when rejecting a sample."
          : "Only a collected sample can be received or rejected.",
        409,
      );
    }
    const now = new Date();
    if (request.action === "RECEIVE") {
      await transaction.labSample.update({
        where: { id: sampleId },
        data: { status: "RECEIVED", receivedByEmployeeId: employeeId, receivedAt: now, rejectionReason: null },
      });
      await transaction.labOrderItem.updateMany({
        where: { id: { in: sample.items.map((item) => item.orderItemId) }, status: "COLLECTED" },
        data: { status: "RECEIVED", receivedAt: now },
      });
      await createAudit(transaction, { employeeId, action: "LAB_SAMPLE_RECEIVED", entityType: "LabSample", entityId: sampleId });
      return { id: sample.id, sampleNumber: sample.sampleNumber, status: "RECEIVED" as const, receivedAt: now.toISOString() };
    }

    await transaction.labSample.update({
      where: { id: sampleId },
      data: { status: "REJECTED", rejectionReason: request.reason, receivedByEmployeeId: employeeId, receivedAt: now },
    });
    await transaction.labOrderItem.updateMany({
      where: { id: { in: sample.items.map((item) => item.orderItemId) }, status: "COLLECTED" },
      data: { status: "REJECTED" },
    });
    await createAudit(transaction, {
      employeeId,
      action: "LAB_SAMPLE_REJECTED",
      entityType: "LabSample",
      entityId: sampleId,
    });
    return { id: sample.id, sampleNumber: sample.sampleNumber, status: "REJECTED" as const, rejectionReason: request.reason };
  }, { isolationLevel: "Serializable" });
}

const processItemSelect = {
  id: true,
  status: true,
  sampleAssignments: {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: { sample: { select: { status: true } } },
  },
} satisfies Prisma.LabOrderItemSelect;

export async function startLabProcessing(orderItemId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    await resolveLabEmployee(transaction, employeeId);
    await lockRow(transaction, "LabOrderItem", orderItemId);
    const item = await transaction.labOrderItem.findUnique({ where: { id: orderItemId }, select: processItemSelect });
    if (!item) labError("LAB_ORDER_ITEM_NOT_FOUND", "The laboratory order item was not found.", 404);
    const decision = decideLabProcessing({
      itemStatus: item.status,
      latestSampleStatus: item.sampleAssignments[0]?.sample.status ?? null,
    });
    if (decision.kind === "REJECT") {
      labError("LAB_ORDER_ITEM_NOT_PROCESSABLE", "Only an item with a received sample can enter processing.", 409);
    }
    const now = new Date();
    await transaction.labOrderItem.update({ where: { id: orderItemId }, data: { status: "PROCESSING", processedAt: now } });
    await createAudit(transaction, { employeeId, action: "LAB_TEST_PROCESSING_STARTED", entityType: "LabOrderItem", entityId: orderItemId });
    return { orderItemId, status: "PROCESSING" as const, processedAt: now.toISOString() };
  }, { isolationLevel: "Serializable" });
}

const resultDraftItemSelect = {
  id: true,
  status: true,
  labTest: {
    select: {
      id: true,
      components: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        select: { code: true, name: true, valueType: true, defaultUnit: true },
      },
    },
  },
  result: { select: { id: true, status: true, authoredByEmployeeId: true } },
} satisfies Prisma.LabOrderItemSelect;

export async function saveLabResultDraft(orderItemId: string, employeeId: string, request: LabResultDraftRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    await resolveLabEmployee(transaction, employeeId);
    await lockRow(transaction, "LabOrderItem", orderItemId);
    const item = await transaction.labOrderItem.findUnique({ where: { id: orderItemId }, select: resultDraftItemSelect });
    if (!item) labError("LAB_ORDER_ITEM_NOT_FOUND", "The laboratory order item was not found.", 404);
    const decision = decideLabResultDraft({
      itemStatus: item.status,
      existingResultStatus: item.result?.status ?? null,
      existingAuthorEmployeeId: item.result?.authoredByEmployeeId ?? null,
      actorEmployeeId: employeeId,
    });
    if (decision.kind === "REJECT") {
      const messages: Record<string, { message: string; status: number }> = {
        LAB_ORDER_ITEM_NOT_PROCESSABLE: { message: "Start processing the received sample before entering results.", status: 409 },
        LAB_RESULT_NOT_EDITABLE: { message: "Only a draft laboratory result can be edited.", status: 409 },
        LAB_RESULT_AUTHOR_MISMATCH: { message: "Only the employee who authored this draft can edit it.", status: 403 },
      };
      const error = messages[decision.code];
      labError(decision.code, error.message, error.status);
    }

    const componentsByCode = new Map(item.labTest.components.map((component) => [component.code, component]));
    const createValues: Array<Omit<Prisma.LabResultValueCreateManyInput, "labResultId">> = [];
    for (const value of request.values) {
      const component = componentsByCode.get(value.componentCode);
      if (!component) labError("LAB_RESULT_COMPONENT_INVALID", "A result value references a component that is not active for this test.", 400);
      const filled = [value.valueText !== undefined && value.valueText !== null, value.valueNumeric !== undefined && value.valueNumeric !== null, value.valueBoolean !== undefined && value.valueBoolean !== null].filter(Boolean).length;
      const valid = component.valueType === "TEXT"
        ? filled === 1 && value.valueText !== undefined && value.valueText !== null
        : component.valueType === "NUMERIC"
          ? filled === 1 && value.valueNumeric !== undefined && value.valueNumeric !== null
          : filled === 1 && value.valueBoolean !== undefined && value.valueBoolean !== null;
      if (!valid) labError("LAB_RESULT_VALUE_INVALID", `Enter exactly one value using the ${component.valueType.toLowerCase()} format for component ${component.code}.`, 400);
      createValues.push({
        componentCodeSnapshot: component.code,
        componentNameSnapshot: component.name,
        valueType: component.valueType,
        valueText: value.valueText ?? null,
        valueNumeric: value.valueNumeric ?? null,
        valueBoolean: value.valueBoolean ?? null,
        unitSnapshot: value.unit ?? component.defaultUnit,
        referenceRangeSnapshot: value.referenceRange ?? null,
        abnormalFlag: value.abnormalFlag,
      });
    }

    const now = new Date();
    const result = item.result
      ? await transaction.labResult.update({
          where: { id: item.result.id },
          data: request.resultSummary === undefined ? {} : { resultSummary: request.resultSummary },
          select: { id: true, status: true, resultedAt: true },
        })
      : await transaction.labResult.create({
          data: {
            orderItemId,
            status: "DRAFT",
            resultSummary: request.resultSummary ?? null,
            authoredByEmployeeId: employeeId,
            resultedAt: now,
          },
          select: { id: true, status: true, resultedAt: true },
        });

    await transaction.labResultValue.deleteMany({ where: { labResultId: result.id } });
    if (createValues.length > 0) {
      await transaction.labResultValue.createMany({
        data: createValues.map((value) => ({ ...value, labResultId: result.id })),
      });
    }
    await createAudit(transaction, {
      employeeId,
      action: "LAB_RESULT_DRAFT_SAVED",
      entityType: "LabResult",
      entityId: result.id,
    });
    return {
      id: result.id,
      status: result.status,
      resultedAt: result.resultedAt.toISOString(),
      valueCount: createValues.length,
    };
  }, { isolationLevel: "Serializable" });
}

export function mapLabWorkflowError(error: unknown): never {
  if (error instanceof LabWorkflowError) throw error;
  if (isPrismaCode(error, "P2002")) {
    labError("LAB_WORKFLOW_CONFLICT", "The laboratory operation conflicts with an existing record. Refresh the worklist and try again.", 409);
  }
  if (isPrismaCode(error, "P2034")) {
    labError("LAB_WORKFLOW_CONFLICT", "Another laboratory operation changed this record. Refresh and try again.", 409);
  }
  throw error;
}
