import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import type {
  DoctorLabClinicalReviewRequest,
  LabCriticalAcknowledgementRequest,
  LabCriticalCommunicationRequest,
  LabCriticalEscalationRequest,
  LabResultReviewRequest,
} from "./lab-result-review-validation";
import {
  decideCriticalCommunicationAcknowledgement,
  decideCriticalCommunicationEscalation,
  decideCriticalCommunicationRecord,
  decideDoctorLabClinicalReview,
  decideLabResultRelease,
  decideLabResultReview,
  decideLabResultSubmission,
} from "./lab-result-review-policy";

export class LabResultReviewError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "LabResultReviewError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;
function fail(code: string, message: string, status: number): never { throw new LabResultReviewError(code, message, status); }
function prismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

const employeeSelect = {
  id: true,
  status: true,
  roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } },
  doctorProfile: { select: { id: true } },
} satisfies Prisma.EmployeeSelect;

type EmployeeSource = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;

async function resolveEmployee(transaction: Transaction, employeeId: string): Promise<EmployeeSource> {
  const employee = await transaction.employee.findUnique({ where: { id: employeeId }, select: employeeSelect });
  if (!employee || employee.status !== "ACTIVE") fail("LAB_WORKFLOW_ACCESS_REQUIRED", "An active employee assignment is required.", 403);
  return employee;
}

async function requireLabStaff(transaction: Transaction, employeeId: string): Promise<EmployeeSource> {
  const employee = await resolveEmployee(transaction, employeeId);
  if (!employee.roleAssignments.some((assignment) => assignment.role === "LAB_STAFF")) {
    fail("LAB_WORKFLOW_ACCESS_REQUIRED", "An active Lab Staff assignment is required.", 403);
  }
  return employee;
}

async function requireDoctor(transaction: Transaction, employeeId: string): Promise<EmployeeSource> {
  const employee = await resolveEmployee(transaction, employeeId);
  if (!employee.roleAssignments.some((assignment) => assignment.role === "DOCTOR") || !employee.doctorProfile) {
    fail("DOCTOR_WORKSPACE_ACCESS_REQUIRED", "An active Doctor profile is required.", 403);
  }
  return employee;
}

async function audit(transaction: Transaction, employeeId: string, action: string, entityType: string, entityId: string, reason?: string) {
  await transaction.auditLog.create({
    data: { actorType: "EMPLOYEE", actorEmployeeId: employeeId, action, entityType, entityId, reason: reason ?? null },
  });
}

async function lockLabResult(transaction: Transaction, resultId: string) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "LabResult" WHERE "id" = ${resultId} FOR UPDATE`;
  if (rows.length !== 1) fail("LAB_RESULT_NOT_FOUND", "The laboratory result was not found.", 404);
}
async function lockOrderItem(transaction: Transaction, orderItemId: string) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "LabOrderItem" WHERE "id" = ${orderItemId} FOR UPDATE`;
  if (rows.length !== 1) fail("LAB_ORDER_ITEM_NOT_FOUND", "The laboratory order item was not found.", 404);
}
async function lockCommunication(transaction: Transaction, communicationId: string) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "LabCriticalCommunication" WHERE "id" = ${communicationId} FOR UPDATE`;
  if (rows.length !== 1) fail("LAB_CRITICAL_COMMUNICATION_NOT_FOUND", "The critical communication was not found.", 404);
}

const resultForReviewSelect = {
  id: true,
  status: true,
  resultSummary: true,
  authoredByEmployeeId: true,
  values: { select: { abnormalFlag: true } },
  orderItem: { select: { id: true, status: true, labOrderId: true } },
} satisfies Prisma.LabResultSelect;

export async function submitLabResultForReview(orderItemId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    await requireLabStaff(transaction, employeeId);
    await lockOrderItem(transaction, orderItemId);
    const item = await transaction.labOrderItem.findUnique({
      where: { id: orderItemId },
      select: { id: true, status: true, result: { select: resultForReviewSelect } },
    });
    if (!item?.result) fail("LAB_RESULT_NOT_FOUND", "A draft result was not found for this order item.", 404);
    const result = item.result;
    const decision = decideLabResultSubmission({
      itemStatus: item.status,
      resultStatus: result.status,
      authorEmployeeId: result.authoredByEmployeeId,
      actorEmployeeId: employeeId,
      hasResultContent: Boolean(result.resultSummary?.trim()) || result.values.length > 0,
    });
    if (decision.kind === "REJECT") {
      const status = decision.code === "LAB_RESULT_AUTHOR_MISMATCH" ? 403 : 409;
      fail(decision.code, "The result cannot be submitted for review in its current state.", status);
    }
    const now = new Date();
    const updated = await transaction.labResult.update({
      where: { id: result.id }, data: { status: "PENDING_REVIEW" }, select: { id: true, status: true, resultedAt: true },
    });
    await audit(transaction, employeeId, "LAB_RESULT_SUBMITTED_FOR_REVIEW", "LabResult", result.id);
    return { ...updated, resultedAt: updated.resultedAt.toISOString(), submittedAt: now.toISOString() };
  }, { isolationLevel: "Serializable" });
}

const reviewQueueSelect = {
  id: true,
  status: true,
  resultSummary: true,
  resultedAt: true,
  authoredByEmployee: { select: { id: true, firstName: true, lastName: true } },
  orderItem: {
    select: {
      id: true,
      labTest: { select: { code: true, name: true } },
      labOrder: {
        select: {
          priority: true,
          encounter: { select: { patient: { select: { mrn: true, firstName: true, lastName: true } } } },
          externalIntake: { select: { intakeReference: true, requestSource: true, referringProviderName: true, referringFacilityName: true, externalRequestReference: true, patient: { select: { mrn: true, firstName: true, lastName: true, recordType: true } } } },
        },
      },
    },
  },
  values: { select: { componentCodeSnapshot: true, componentNameSnapshot: true, valueType: true, valueText: true, valueNumeric: true, valueBoolean: true, unitSnapshot: true, referenceRangeSnapshot: true, abnormalFlag: true, sortOrder: true } },
} satisfies Prisma.LabResultSelect;

export async function getLabResultReviewWorklist(employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (transaction) => { await requireLabStaff(transaction, employeeId); });
  const results = await prisma.labResult.findMany({
    where: { status: "PENDING_REVIEW" }, orderBy: [{ resultedAt: "asc" }, { id: "asc" }], take: 100, select: reviewQueueSelect,
  });
  return {
    items: results.map((result) => ({
      id: result.id, status: result.status, resultSummary: result.resultSummary, resultedAt: result.resultedAt.toISOString(),
      author: { id: result.authoredByEmployee.id, displayName: `${result.authoredByEmployee.firstName} ${result.authoredByEmployee.lastName}` },
      priority: result.orderItem.labOrder.priority,
      patient: (() => {
        const patient = result.orderItem.labOrder.encounter?.patient ?? result.orderItem.labOrder.externalIntake?.patient;
        return patient ? { mrn: patient.mrn, displayName: `${patient.firstName} ${patient.lastName}` } : null;
      })(),
      origin: result.orderItem.labOrder.externalIntake ? "EXTERNAL_INTAKE" as const : "CLINIC_ENCOUNTER" as const,
      externalIntake: result.orderItem.labOrder.externalIntake ? {
        reference: result.orderItem.labOrder.externalIntake.intakeReference,
        requestSource: result.orderItem.labOrder.externalIntake.requestSource,
        referringProviderName: result.orderItem.labOrder.externalIntake.referringProviderName,
        referringFacilityName: result.orderItem.labOrder.externalIntake.referringFacilityName,
        externalRequestReference: result.orderItem.labOrder.externalIntake.externalRequestReference,
      } : null,
      test: result.orderItem.labTest,
      values: result.values.map((value) => ({ ...value, valueNumeric: value.valueNumeric?.toString() ?? null })),
    })),
    limit: 100,
  };
}

export async function getLabCriticalCommunicationWorklist(employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (transaction) => { await requireLabStaff(transaction, employeeId); });
  const items = await prisma.labCriticalCommunication.findMany({
    where: { status: { in: ["NOTIFIED", "ESCALATED"] } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true, status: true, method: true, communicatedToName: true, notifiedAt: true, escalatedAt: true,
      labResult: {
        select: {
          id: true,
          orderItem: {
            select: {
              labTest: { select: { code: true, name: true } },
              labOrder: {
                select: {
                  encounter: { select: { patient: { select: { mrn: true, firstName: true, lastName: true } } } },
                  externalIntake: { select: { intakeReference: true, referringFacilityName: true, patient: { select: { mrn: true, firstName: true, lastName: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  return {
    items: items.map((item) => ({
      id: item.id, status: item.status, method: item.method, communicatedToName: item.communicatedToName,
      notifiedAt: item.notifiedAt?.toISOString() ?? null, escalatedAt: item.escalatedAt?.toISOString() ?? null,
      resultId: item.labResult.id, test: item.labResult.orderItem.labTest,
      patient: (() => {
        const patient = item.labResult.orderItem.labOrder.encounter?.patient ?? item.labResult.orderItem.labOrder.externalIntake?.patient;
        return patient ? { mrn: patient.mrn, displayName: `${patient.firstName} ${patient.lastName}` } : null;
      })(),
      externalIntake: item.labResult.orderItem.labOrder.externalIntake ? { reference: item.labResult.orderItem.labOrder.externalIntake.intakeReference, referringFacilityName: item.labResult.orderItem.labOrder.externalIntake.referringFacilityName } : null,
    })),
    limit: 100,
  };
}

export async function reviewLabResult(resultId: string, employeeId: string, request: LabResultReviewRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    await requireLabStaff(transaction, employeeId);
    await lockLabResult(transaction, resultId);
    const result = await transaction.labResult.findUnique({ where: { id: resultId }, select: { id: true, status: true, authoredByEmployeeId: true } });
    if (!result) fail("LAB_RESULT_NOT_FOUND", "The laboratory result was not found.", 404);
    const decision = decideLabResultReview({ resultStatus: result.status, authorEmployeeId: result.authoredByEmployeeId, reviewerEmployeeId: employeeId, decision: request.decision });
    if (decision.kind === "REJECT") fail(decision.code, "The result cannot be reviewed by this employee in its current state.", decision.code === "LAB_RESULT_SELF_REVIEW_FORBIDDEN" ? 403 : 409);
    const now = new Date();
    await transaction.labResultReview.create({ data: { labResultId: resultId, reviewerEmployeeId: employeeId, decision: request.decision, comments: request.comments ?? null, reviewedAt: now } });
    const updated = await transaction.labResult.update({
      where: { id: resultId },
      data: request.decision === "APPROVED"
        ? { status: "APPROVED", approvedByEmployeeId: employeeId, approvedAt: now }
        : { status: "DRAFT", approvedByEmployeeId: null, approvedAt: null },
      select: { id: true, status: true, approvedAt: true },
    });
    await audit(
      transaction,
      employeeId,
      request.decision === "APPROVED" ? "LAB_RESULT_APPROVED" : "LAB_RESULT_RETURNED_FOR_CORRECTION",
      "LabResult",
      resultId,
      request.decision === "APPROVED" ? "Result approved by an independent Lab Staff reviewer." : "Result returned for correction; see the linked review record.",
    );
    return { ...updated, approvedAt: updated.approvedAt?.toISOString() ?? null, reviewDecision: request.decision };
  }, { isolationLevel: "Serializable" });
}

const criticalFlagValues = ["CRITICAL_LOW", "CRITICAL_HIGH"] as const;
export async function recordLabCriticalCommunication(resultId: string, employeeId: string, request: LabCriticalCommunicationRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    await requireLabStaff(transaction, employeeId);
    await lockLabResult(transaction, resultId);
    const result = await transaction.labResult.findUnique({
      where: { id: resultId },
      select: {
        id: true,
        status: true,
        values: { select: { abnormalFlag: true } },
        orderItem: {
          select: {
            labOrder: {
              select: {
                encounter: { select: { doctorId: true } },
                externalIntake: { select: { id: true } },
              },
            },
          },
        },
      },
    });
    if (!result) fail("LAB_RESULT_NOT_FOUND", "The laboratory result was not found.", 404);
    const hasCriticalValues = result.values.some((value) => criticalFlagValues.includes(value.abnormalFlag as (typeof criticalFlagValues)[number]));
    const recordDecision = decideCriticalCommunicationRecord({ resultStatus: result.status, hasCriticalValues });
    if (recordDecision.kind === "REJECT") fail(recordDecision.code, "Critical communication requires an approved result with an explicit critical flag.", 409);
    const now = new Date();
    const communication = await transaction.labCriticalCommunication.create({
      data: { labResultId: resultId, status: "NOTIFIED", method: request.method, communicatedToName: request.communicatedToName, readBackRequired: true, notifiedByEmployeeId: employeeId, notifiedAt: now },
      select: { id: true, status: true, method: true, communicatedToName: true, notifiedAt: true, readBackRequired: true },
    });
    const encounter = result.orderItem.labOrder.encounter;
    if (encounter) {
      const orderingDoctor = await transaction.doctorProfile.findUnique({ where: { id: encounter.doctorId }, select: { employeeId: true } });
      if (!orderingDoctor) fail("LAB_CRITICAL_DOCTOR_REQUIRED", "The ordering Doctor employee link is unavailable.", 409);
      await transaction.notification.create({
        data: {
          employeeId: orderingDoctor.employeeId,
          channel: "IN_APP",
          title: "Critical laboratory result requires acknowledgement",
          message: "A critical laboratory result communication is awaiting your read-back acknowledgement.",
          actionPath: `/doctor/lab-results/${resultId}`,
        },
      });
    }
    await audit(transaction, employeeId, "LAB_CRITICAL_RESULT_NOTIFIED", "LabCriticalCommunication", communication.id, "Critical-result communication recorded; read-back is required.");
    return { ...communication, notifiedAt: communication.notifiedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

const communicationSelect = {
  id: true, status: true, readBackRequired: true,
  labResult: { select: { id: true, status: true, orderItem: { select: { labOrder: { select: { encounter: { select: { doctorId: true } }, externalIntake: { select: { id: true } } } } } } } },
} satisfies Prisma.LabCriticalCommunicationSelect;

export async function acknowledgeLabCriticalCommunication(communicationId: string, employeeId: string, request: LabCriticalAcknowledgementRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    const employee = await resolveEmployee(transaction, employeeId);
    await lockCommunication(transaction, communicationId);
    const communication = await transaction.labCriticalCommunication.findUnique({ where: { id: communicationId }, select: communicationSelect });
    if (!communication) fail("LAB_CRITICAL_COMMUNICATION_NOT_FOUND", "The critical communication was not found.", 404);
    const externalIntake = communication.labResult.orderItem.labOrder.externalIntake;
    if (externalIntake) {
      if (!employee.roleAssignments.some((assignment) => assignment.role === "LAB_STAFF")) fail("LAB_CRITICAL_READ_BACK_ACTOR_REQUIRED", "An active Lab Staff employee must record external-provider read-back.", 403);
      if (!request.resolutionNotes?.trim()) fail("LAB_CRITICAL_READ_BACK_NOTES_REQUIRED", "Record who confirmed the external-provider read-back and the communication context.", 400);
    } else {
      if (!employee.roleAssignments.some((assignment) => assignment.role === "DOCTOR") || !employee.doctorProfile) fail("DOCTOR_WORKSPACE_ACCESS_REQUIRED", "An active Doctor profile is required.", 403);
    }
    const policy = decideCriticalCommunicationAcknowledgement({
      status: communication.status, readBackRequired: communication.readBackRequired, readBackConfirmed: request.readBackConfirmed,
      isOrderingDoctor: externalIntake ? true : employee.doctorProfile?.id === communication.labResult.orderItem.labOrder.encounter?.doctorId,
    });
    if (policy.kind === "REJECT") fail(policy.code, "The critical communication cannot be acknowledged by this actor or in its current state.", policy.code === "LAB_CRITICAL_DOCTOR_REQUIRED" ? 403 : 409);
    const now = new Date();
    const updated = await transaction.labCriticalCommunication.update({
      where: { id: communicationId }, data: { status: "ACKNOWLEDGED", acknowledgedByEmployeeId: employeeId, acknowledgedAt: now, readBackConfirmedAt: now, ...(request.resolutionNotes !== undefined ? { resolutionNotes: request.resolutionNotes } : {}) },
      select: { id: true, status: true, acknowledgedAt: true, readBackConfirmedAt: true },
    });
    await audit(transaction, employeeId, "LAB_CRITICAL_RESULT_ACKNOWLEDGED", "LabCriticalCommunication", communicationId, externalIntake ? "Lab Staff recorded external-provider critical-result read-back; see resolution notes." : "Ordering Doctor confirmed the critical-result read-back.");
    return { ...updated, acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null, readBackConfirmedAt: updated.readBackConfirmedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export async function escalateLabCriticalCommunication(communicationId: string, employeeId: string, request: LabCriticalEscalationRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    await requireLabStaff(transaction, employeeId);
    await lockCommunication(transaction, communicationId);
    const communication = await transaction.labCriticalCommunication.findUnique({ where: { id: communicationId }, select: { id: true, status: true } });
    if (!communication) fail("LAB_CRITICAL_COMMUNICATION_NOT_FOUND", "The critical communication was not found.", 404);
    const decision = decideCriticalCommunicationEscalation({ status: communication.status, hasReason: Boolean(request.reason.trim()) });
    if (decision.kind === "REJECT") fail(decision.code, "The critical communication cannot be escalated in its current state.", 409);
    const now = new Date();
    const updated = await transaction.labCriticalCommunication.update({
      where: { id: communicationId }, data: { status: "ESCALATED", escalatedAt: now, resolutionNotes: request.reason },
      select: { id: true, status: true, escalatedAt: true },
    });
    await audit(transaction, employeeId, "LAB_CRITICAL_RESULT_ESCALATED", "LabCriticalCommunication", communicationId, "Critical-result escalation recorded.");
    return { ...updated, escalatedAt: updated.escalatedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export async function releaseLabResult(resultId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    await requireLabStaff(transaction, employeeId);
    const initial = await transaction.labResult.findUnique({ where: { id: resultId }, select: { orderItemId: true } });
    if (!initial) fail("LAB_RESULT_NOT_FOUND", "The laboratory result was not found.", 404);
    await lockOrderItem(transaction, initial.orderItemId);
    await lockLabResult(transaction, resultId);
    const result = await transaction.labResult.findUnique({
      where: { id: resultId },
      select: { id: true, status: true, values: { select: { abnormalFlag: true } }, criticalCommunications: { select: { status: true, readBackConfirmedAt: true } }, orderItem: { select: { id: true, status: true, labOrderId: true } } },
    });
    if (!result) fail("LAB_RESULT_NOT_FOUND", "The laboratory result was not found.", 404);
    const hasCriticalValues = result.values.some((value) => criticalFlagValues.includes(value.abnormalFlag as (typeof criticalFlagValues)[number]));
    const hasAcknowledgedReadBack = result.criticalCommunications.length > 0
      && result.criticalCommunications.every((communication) => communication.status === "ACKNOWLEDGED" && communication.readBackConfirmedAt !== null);
    if (result.orderItem.status !== "PROCESSING") fail("LAB_ORDER_ITEM_NOT_PROCESSING", "The laboratory order item is no longer in the processing state.", 409);
    const decision = decideLabResultRelease({ resultStatus: result.status, hasCriticalValues, hasAcknowledgedReadBack: !hasCriticalValues || hasAcknowledgedReadBack });
    if (decision.kind === "REJECT") fail(decision.code, "The laboratory result cannot be released before approval and required critical-result read-back.", 409);
    const now = new Date();
    const updated = await transaction.labResult.update({ where: { id: resultId }, data: { status: "RELEASED", releasedAt: now }, select: { id: true, status: true, releasedAt: true } });
    await transaction.labOrderItem.update({ where: { id: result.orderItem.id }, data: { status: "RESULTED" } });
    const unfinishedItems = await transaction.labOrderItem.count({ where: { labOrderId: result.orderItem.labOrderId, status: { notIn: ["RESULTED", "CANCELLED"] } } });
    if (unfinishedItems === 0) await transaction.labOrder.update({ where: { id: result.orderItem.labOrderId }, data: { status: "COMPLETED", completedAt: now } });
    await audit(transaction, employeeId, "LAB_RESULT_RELEASED", "LabResult", resultId);
    return { ...updated, releasedAt: updated.releasedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

const doctorResultSelect = {
  id: true, status: true, resultSummary: true, resultedAt: true, approvedAt: true, releasedAt: true,
  orderItem: {
    select: {
      labTest: { select: { code: true, name: true } },
      labOrder: {
        select: {
          encounter: {
            select: { id: true, doctorId: true, patient: { select: { mrn: true, firstName: true, lastName: true } } },
          },
        },
      },
    },
  },
  values: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { componentCodeSnapshot: true, componentNameSnapshot: true, valueType: true, valueText: true, valueNumeric: true, valueBoolean: true, unitSnapshot: true, referenceRangeSnapshot: true, abnormalFlag: true } },
  clinicalReviews: { orderBy: [{ reviewedAt: "desc" }], take: 5, select: { decision: true, notes: true, reviewedAt: true } },
  criticalCommunications: { where: { status: { in: ["NOTIFIED", "ESCALATED"] } }, orderBy: [{ createdAt: "asc" }], select: { id: true, status: true, method: true, communicatedToName: true, notifiedAt: true, escalatedAt: true, readBackRequired: true } },
} satisfies Prisma.LabResultSelect;

export async function getDoctorLabResult(resultId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    const employee = await requireDoctor(transaction, employeeId);
    const result = await transaction.labResult.findUnique({ where: { id: resultId }, select: doctorResultSelect });
    if (!result) fail("LAB_RESULT_NOT_FOUND", "The laboratory result was not found.", 404);
    const encounter = result.orderItem.labOrder.encounter;
    if (!encounter || encounter.doctorId !== employee.doctorProfile?.id) fail("LAB_RESULT_NOT_FOUND", "The laboratory result was not found for this Doctor.", 404);
    const mayViewPreReleaseCriticalResult = result.status === "APPROVED" && result.criticalCommunications.length > 0;
    if (result.status !== "RELEASED" && !mayViewPreReleaseCriticalResult) {
      fail("LAB_RESULT_NOT_RELEASED", "Only released results are available, except an approved critical result with an outstanding read-back request for the ordering Doctor.", 409);
    }
    return {
      id: result.id, status: result.status, resultSummary: result.resultSummary,
      resultedAt: result.resultedAt.toISOString(), approvedAt: result.approvedAt?.toISOString() ?? null, releasedAt: result.releasedAt?.toISOString() ?? null,
      patient: { mrn: encounter.patient.mrn, displayName: `${encounter.patient.firstName} ${encounter.patient.lastName}` },
      test: result.orderItem.labTest,
      values: result.values.map((value) => ({ ...value, valueNumeric: value.valueNumeric?.toString() ?? null })),
      recentClinicalReviews: result.clinicalReviews.map((review) => ({ ...review, reviewedAt: review.reviewedAt.toISOString() })),
      pendingCriticalCommunications: result.criticalCommunications.map((communication) => ({
        ...communication, notifiedAt: communication.notifiedAt?.toISOString() ?? null, escalatedAt: communication.escalatedAt?.toISOString() ?? null,
      })),
    };
  });
}

export async function recordDoctorLabClinicalReview(resultId: string, employeeId: string, request: DoctorLabClinicalReviewRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction) => {
    const employee = await requireDoctor(transaction, employeeId);
    await lockLabResult(transaction, resultId);
    const result = await transaction.labResult.findUnique({
      where: { id: resultId },
      select: { id: true, status: true, orderItem: { select: { labOrder: { select: { encounter: { select: { doctorId: true } } } } } } },
    });
    if (!result) fail("LAB_RESULT_NOT_FOUND", "The laboratory result was not found.", 404);
    const encounter = result.orderItem.labOrder.encounter;
    const decision = decideDoctorLabClinicalReview({ resultStatus: result.status, isOrderingDoctor: Boolean(encounter && encounter.doctorId === employee.doctorProfile?.id) });
    if (decision.kind === "REJECT") fail(decision.code, "Only the ordering Doctor can review a released laboratory result.", decision.code === "LAB_CLINICAL_REVIEW_DOCTOR_REQUIRED" ? 403 : 409);
    const now = new Date();
    const review = await transaction.labClinicalReview.upsert({
      where: { labResultId_reviewerEmployeeId: { labResultId: resultId, reviewerEmployeeId: employeeId } },
      create: { labResultId: resultId, reviewerEmployeeId: employeeId, decision: request.decision, notes: request.notes ?? null, reviewedAt: now },
      update: { decision: request.decision, notes: request.notes ?? null, reviewedAt: now },
      select: { id: true, decision: true, notes: true, reviewedAt: true },
    });
    await audit(transaction, employeeId, request.decision === "FOLLOW_UP_REQUIRED" ? "LAB_RESULT_FOLLOW_UP_REQUIRED" : "LAB_RESULT_CLINICALLY_REVIEWED", "LabClinicalReview", review.id, "Ordering Doctor recorded a clinical review decision.");
    return { ...review, reviewedAt: review.reviewedAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export function mapLabResultReviewError(error: unknown): unknown {
  if (error instanceof LabResultReviewError) return error;
  if (prismaCode(error, "P2002") || prismaCode(error, "P2034")) {
    return new LabResultReviewError("LAB_RESULT_REVIEW_CONFLICT", "Another laboratory result operation changed this record. Refresh and try again.", 409);
  }
  return error;
}
