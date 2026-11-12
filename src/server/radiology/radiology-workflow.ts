import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { verifyPatientIdentityMatch, type PatientIdentityVerificationRecord } from "../patient-management/identity-verification-validation";
import type {
  RadiologyIdentityVerificationRequest,
  RadiologyPreparationRequest,
  RadiologyPregnancyReviewRequest,
  RadiologyPregnancyScreeningRequest,
  RadiologyScheduleRequest,
} from "./radiology-scheduling-validation";
import { decideRadiologyReadiness, decideRadiologyScheduling, requiresRadiologistPregnancyReview } from "./radiology-workflow-policy";

export class RadiologyWorkflowError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "RadiologyWorkflowError";
    this.code = code;
    this.status = status;
  }
}

type Tx = Prisma.TransactionClient;
function fail(code: string, message: string, status: number): never { throw new RadiologyWorkflowError(code, message, status); }

async function resolveEmployee(tx: Tx, employeeId: string) {
  const employee = await tx.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, status: true, roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } }, doctorProfile: { select: { id: true } } },
  });
  if (!employee || employee.status !== "ACTIVE") fail("RADIOLOGY_WORKSPACE_ACCESS_REQUIRED", "An active employee session is required.", 403);
  return employee;
}
async function requireRole(tx: Tx, employeeId: string, role: "RADIOLOGY_STAFF" | "RADIOLOGIST") {
  const employee = await resolveEmployee(tx, employeeId);
  if (!employee.roleAssignments.some((assignment) => assignment.role === role)) fail("RADIOLOGY_WORKSPACE_ACCESS_REQUIRED", `An active ${role.replace("_", " ")} role is required.`, 403);
  return employee;
}
async function audit(tx: Tx, employeeId: string, action: string, entityType: string, entityId: string, reason?: string) {
  await tx.auditLog.create({ data: { actorType: "EMPLOYEE", actorEmployeeId: employeeId, action, entityType, entityId, reason: reason ?? null } });
}
async function lockRow(tx: Tx, table: "RadiologyResource" | "RadiologyOrderItem" | "RadiologyExam", id: string) {
  const rows = table === "RadiologyResource"
    ? await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "RadiologyResource" WHERE "id" = ${id} FOR UPDATE`
    : table === "RadiologyOrderItem"
      ? await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "RadiologyOrderItem" WHERE "id" = ${id} FOR UPDATE`
      : await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "RadiologyExam" WHERE "id" = ${id} FOR UPDATE`;
  if (rows.length !== 1) fail(table === "RadiologyResource" ? "RADIOLOGY_RESOURCE_NOT_FOUND" : table === "RadiologyOrderItem" ? "RADIOLOGY_ORDER_ITEM_NOT_FOUND" : "RADIOLOGY_EXAM_NOT_FOUND", "The requested radiology record was not found.", 404);
}

const radiologyWorklistSelect = {
  id: true,
  status: true,
  priceSnapshot: true,
  currencyCode: true,
  instructions: true,
  procedure: { select: { id: true, code: true, name: true, modality: true, defaultDurationMinutes: true, preparationInstructions: true } },
  radiologyOrder: {
    select: {
      id: true, orderReference: true, priority: true, orderedAt: true,
      encounter: { select: { patient: { select: { id: true, mrn: true, firstName: true, lastName: true, isActive: true } } } },
    },
  },
  exam: {
    select: {
      id: true, status: true, scheduledStartsAt: true, scheduledEndsAt: true,
      preparationInstructionsSnapshot: true, preparationStatus: true, preparationNotes: true,
      resource: { select: { id: true, code: true, name: true, location: true, modality: true } },
      identityVerifications: { orderBy: [{ verifiedAt: "desc" }], take: 1, select: { result: true, verifiedAt: true } },
      pregnancyScreening: { select: { result: true, screeningNotes: true, screenedAt: true, reviewDecision: true, reviewNotes: true, reviewedAt: true } },
    },
  },
} satisfies Prisma.RadiologyOrderItemSelect;

export async function getRadiologyWorklist(employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => { await requireRole(tx, employeeId, "RADIOLOGY_STAFF"); });
  const [items, resources] = await Promise.all([
    prisma.radiologyOrderItem.findMany({
      where: { status: { in: ["PENDING", "SCHEDULED"] }, radiologyOrder: { status: { in: ["ORDERED", "SCHEDULED"] } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 100,
      select: radiologyWorklistSelect,
    }),
    prisma.radiologyResource.findMany({
      where: { isActive: true },
      orderBy: [{ modality: "asc" }, { code: "asc" }],
      select: { id: true, code: true, name: true, modality: true, location: true },
    }),
  ]);
  const mappedItems = items.map((item) => ({
      id: item.id, status: item.status, procedure: item.procedure,
      order: { id: item.radiologyOrder.id, reference: item.radiologyOrder.orderReference, priority: item.radiologyOrder.priority, orderedAt: item.radiologyOrder.orderedAt.toISOString() },
      patient: { id: item.radiologyOrder.encounter.patient.id, mrn: item.radiologyOrder.encounter.patient.mrn, displayName: `${item.radiologyOrder.encounter.patient.firstName} ${item.radiologyOrder.encounter.patient.lastName}`, isActive: item.radiologyOrder.encounter.patient.isActive },
      exam: item.exam ? {
        id: item.exam.id, status: item.exam.status,
        scheduledStartsAt: item.exam.scheduledStartsAt?.toISOString() ?? null,
        scheduledEndsAt: item.exam.scheduledEndsAt?.toISOString() ?? null,
        resource: item.exam.resource,
        preparation: { instructions: item.exam.preparationInstructionsSnapshot, status: item.exam.preparationStatus, notes: item.exam.preparationNotes },
        identityVerified: item.exam.identityVerifications[0]?.result === "VERIFIED",
        identityVerifiedAt: item.exam.identityVerifications[0]?.verifiedAt.toISOString() ?? null,
        pregnancyScreening: item.exam.pregnancyScreening ? {
          result: item.exam.pregnancyScreening.result,
          screenedAt: item.exam.pregnancyScreening.screenedAt.toISOString(),
          reviewDecision: item.exam.pregnancyScreening.reviewDecision,
          reviewNotes: item.exam.pregnancyScreening.reviewNotes,
          reviewedAt: item.exam.pregnancyScreening.reviewedAt?.toISOString() ?? null,
        } : null,
      } : null,
    }));
  mappedItems.sort((left, right) => {
    const priority = (left.order.priority === "URGENT" ? 0 : 1) - (right.order.priority === "URGENT" ? 0 : 1);
    return priority || left.order.orderedAt.localeCompare(right.order.orderedAt) || left.id.localeCompare(right.id);
  });
  return { items: mappedItems, resources, limit: 100 };
}

export async function getRadiologyPregnancyReviewWorklist(employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => { await requireRole(tx, employeeId, "RADIOLOGIST"); });
  const exams = await prisma.radiologyExam.findMany({
    where: {
      status: "SCHEDULED",
      pregnancyScreening: { is: { result: { in: ["POSITIVE", "DECLINED"] }, reviewDecision: null } },
    },
    orderBy: [{ scheduledStartsAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true, status: true, scheduledStartsAt: true, scheduledEndsAt: true,
      resource: { select: { code: true, name: true, location: true } },
      orderItem: { select: {
        procedure: { select: { code: true, name: true, modality: true } },
        radiologyOrder: { select: {
          orderReference: true, priority: true,
          encounter: { select: { patient: { select: { mrn: true, firstName: true, lastName: true } } } },
        } },
      } },
      pregnancyScreening: { select: { result: true, screeningNotes: true, screenedAt: true } },
    },
  });
  return {
    items: exams.map((exam) => ({
      id: exam.id,
      status: exam.status,
      scheduledStartsAt: exam.scheduledStartsAt?.toISOString() ?? null,
      scheduledEndsAt: exam.scheduledEndsAt?.toISOString() ?? null,
      orderReference: exam.orderItem.radiologyOrder.orderReference,
      priority: exam.orderItem.radiologyOrder.priority,
      procedure: exam.orderItem.procedure,
      resource: exam.resource,
      patient: {
        mrn: exam.orderItem.radiologyOrder.encounter.patient.mrn,
        displayName: `${exam.orderItem.radiologyOrder.encounter.patient.firstName} ${exam.orderItem.radiologyOrder.encounter.patient.lastName}`,
      },
      screening: exam.pregnancyScreening ? {
        result: exam.pregnancyScreening.result,
        notes: exam.pregnancyScreening.screeningNotes,
        screenedAt: exam.pregnancyScreening.screenedAt.toISOString(),
      } : null,
    })),
    limit: 100,
  };
}

export async function scheduleRadiologyExam(orderItemId: string, employeeId: string, request: RadiologyScheduleRequest) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (tx) => {
      await requireRole(tx, employeeId, "RADIOLOGY_STAFF");
      await lockRow(tx, "RadiologyResource", request.resourceId);
      await lockRow(tx, "RadiologyOrderItem", orderItemId);
      const item = await tx.radiologyOrderItem.findUnique({
        where: { id: orderItemId },
        select: {
          id: true, status: true, preOrderPregnancyAssessment: true,
          procedure: { select: { id: true, modality: true, defaultDurationMinutes: true, preparationInstructions: true } },
          radiologyOrder: { select: { id: true, status: true } },
          exam: { select: { id: true, status: true, preparationStatus: true, pregnancyScreening: { select: { id: true } }, identityVerifications: { select: { id: true } } } },
        },
      });
      if (!item) fail("RADIOLOGY_ORDER_ITEM_NOT_FOUND", "The radiology order item was not found.", 404);
      const workflowStarted = Boolean(item.exam && (item.exam.preparationStatus !== "PENDING" || item.exam.pregnancyScreening || item.exam.identityVerifications.length > 0));
      const resource = await tx.radiologyResource.findFirst({ where: { id: request.resourceId, isActive: true }, select: { id: true, modality: true } });
      const duration = item.procedure.defaultDurationMinutes;
      const startsAt = new Date(request.scheduledStartsAt);
      const decision = decideRadiologyScheduling({
        itemStatus: item.status,
        orderStatus: item.radiologyOrder.status,
        resourceActive: Boolean(resource),
        resourceModality: resource?.modality ?? "",
        procedureModality: item.procedure.modality,
        durationMinutes: duration,
        startsInFuture: startsAt.getTime() > Date.now(),
        workflowStarted,
        preOrderPregnancyAssessment: item.preOrderPregnancyAssessment,
      });
      if (decision.kind === "REJECT") {
        const messages: Record<string, string> = {
          RADIOLOGY_ORDER_NOT_SCHEDULABLE: "Only pending or scheduled radiology order items can be scheduled.",
          RADIOLOGY_RESCHEDULE_LOCKED: "The exam cannot be rescheduled after patient identity or preparation screening has started.",
          RADIOLOGY_RESOURCE_NOT_AVAILABLE: "The selected radiology resource is unavailable.",
          RADIOLOGY_RESOURCE_MODALITY_MISMATCH: "The selected resource does not support this procedure modality.",
          RADIOLOGY_DURATION_NOT_CONFIGURED: "A valid default procedure duration must be configured before scheduling.",
          RADIOLOGY_SCHEDULE_MUST_BE_FUTURE: "Choose a future appointment time.",
          RADIOLOGY_PRE_ORDER_PREGNANCY_ASSESSMENT_REQUIRED: "The ordering Doctor must document the required X-ray pregnancy assessment before scheduling.",
        };
        fail(decision.code, messages[decision.code] ?? "The order cannot be scheduled.", decision.code === "RADIOLOGY_SCHEDULE_MUST_BE_FUTURE" ? 400 : 409);
      }
      if (!resource || !duration) fail("RADIOLOGY_RESOURCE_NOT_AVAILABLE", "The selected resource or procedure duration is unavailable.", 409);
      const endsAt = new Date(startsAt.getTime() + duration * 60_000);
      const conflict = await tx.radiologyExam.findFirst({
        where: {
          resourceId: resource.id,
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          scheduledStartsAt: { lt: endsAt },
          scheduledEndsAt: { gt: startsAt },
          ...(item.exam ? { id: { not: item.exam.id } } : {}),
        },
        select: { id: true },
      });
      if (conflict) fail("RADIOLOGY_RESOURCE_CONFLICT", "The selected room or device is already booked during this time.", 409);
      const exam = await tx.radiologyExam.upsert({
        where: { orderItemId },
        create: { orderItemId, resourceId: resource.id, scheduledStartsAt: startsAt, scheduledEndsAt: endsAt, preparationInstructionsSnapshot: item.procedure.preparationInstructions, preparationStatus: "PENDING" },
        update: { resourceId: resource.id, scheduledStartsAt: startsAt, scheduledEndsAt: endsAt, preparationInstructionsSnapshot: item.procedure.preparationInstructions, preparationStatus: "PENDING", preparationNotes: null, preparationCheckedByEmployeeId: null, preparationCheckedAt: null },
        select: { id: true, scheduledStartsAt: true, scheduledEndsAt: true, preparationStatus: true },
      });
      await tx.radiologyOrderItem.update({ where: { id: orderItemId }, data: { status: "SCHEDULED" } });
      await tx.radiologyOrder.update({ where: { id: item.radiologyOrder.id }, data: { status: "SCHEDULED" } });
      await audit(tx, employeeId, "RADIOLOGY_EXAM_SCHEDULED", "RadiologyExam", exam.id, "Resource allocation is protected by a row lock and the PostgreSQL resource-overlap exclusion constraint.");
      return { ...exam, scheduledStartsAt: exam.scheduledStartsAt?.toISOString() ?? null, scheduledEndsAt: exam.scheduledEndsAt?.toISOString() ?? null };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error.code === "P2004" || error.code === "P2034" || error.code === "P2010")) {
      throw new RadiologyWorkflowError("RADIOLOGY_RESOURCE_CONFLICT", "The selected resource was booked concurrently. Refresh the schedule and choose another time.", 409);
    }
    throw error;
  }
}

const radiologyExamPatientSelect = {
  id: true,
  status: true,
  scheduledStartsAt: true,
  scheduledEndsAt: true,
  preparationStatus: true,
  preparationInstructionsSnapshot: true,
  orderItem: {
    select: {
      status: true,
      procedure: { select: { modality: true } },
      radiologyOrder: {
        select: {
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
                  contacts: {
                    where: { type: "PHONE", isActive: true },
                    select: { normalizedValue: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  identityVerifications: { orderBy: [{ verifiedAt: "desc" }], take: 1, select: { result: true } },
  pregnancyScreening: { select: { id: true, result: true, reviewDecision: true } },
} satisfies Prisma.RadiologyExamSelect;

type RadiologyExamSource = Prisma.RadiologyExamGetPayload<{ select: typeof radiologyExamPatientSelect }>;
function getExamPatient(exam: RadiologyExamSource) { return exam.orderItem.radiologyOrder.encounter.patient; }

export async function verifyRadiologyExamIdentity(examId: string, employeeId: string, request: RadiologyIdentityVerificationRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, "RADIOLOGY_STAFF");
    await lockRow(tx, "RadiologyExam", examId);
    const exam = await tx.radiologyExam.findUnique({ where: { id: examId }, select: radiologyExamPatientSelect });
    if (!exam || exam.status !== "SCHEDULED" || exam.orderItem.status !== "SCHEDULED") fail("RADIOLOGY_EXAM_NOT_READY_FOR_IDENTITY", "Only a scheduled exam can be identity-verified.", 409);
    const patient = getExamPatient(exam);
    if (!patient.isActive) fail("RADIOLOGY_PATIENT_INACTIVE", "The linked patient record is inactive.", 409);
    const verified = verifyPatientIdentityMatch(patient as PatientIdentityVerificationRecord, request.identityVerification);
    const now = new Date();
    const identity = await tx.identityVerification.create({
      data: {
        patientId: patient.id,
        appointmentId: exam.orderItem.radiologyOrder.encounter.appointmentId,
        encounterId: exam.orderItem.radiologyOrder.encounter.id,
        radiologyExamId: examId,
        firstElement: request.identityVerification.firstIdentifier.type,
        secondElement: request.identityVerification.secondIdentifier.type,
        result: verified ? "VERIFIED" : "FAILED",
        performedByEmployeeId: employeeId,
        verifiedAt: now,
        notes: "Two distinct stored patient identity elements were compared at radiology check-in. Submitted values are not retained.",
      }, select: { id: true },
    });
    await audit(tx, employeeId, verified ? "RADIOLOGY_PATIENT_IDENTITY_VERIFIED" : "RADIOLOGY_PATIENT_IDENTITY_FAILED", "IdentityVerification", identity.id, "Two-element radiology identity check; submitted values were not retained.");
    return { identityVerified: verified, verificationId: identity.id, verifiedAt: now.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function recordRadiologyPreparation(examId: string, employeeId: string, request: RadiologyPreparationRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, "RADIOLOGY_STAFF");
    await lockRow(tx, "RadiologyExam", examId);
    const exam = await tx.radiologyExam.findUnique({ where: { id: examId }, select: { id: true, status: true, preparationStatus: true, identityVerifications: { where: { result: "VERIFIED" }, select: { id: true }, take: 1 }, pregnancyScreening: { select: { id: true, reviewDecision: true } } } });
    if (!exam || exam.status !== "SCHEDULED") fail("RADIOLOGY_EXAM_NOT_SCHEDULED", "Preparation can only be recorded for a scheduled exam.", 409);
    if (exam.identityVerifications.length === 0) fail("RADIOLOGY_IDENTITY_VERIFICATION_REQUIRED", "Verify the patient's identity before recording preparation.", 409);
    if (exam.pregnancyScreening?.reviewDecision === "DEFER_EXAM") fail("RADIOLOGY_EXAM_DEFERRED", "The Radiologist deferred this X-ray exam.", 409);
    const now = new Date();
    const updated = await tx.radiologyExam.update({ where: { id: examId }, data: { preparationStatus: request.status, preparationNotes: request.notes ?? null, preparationCheckedByEmployeeId: employeeId, preparationCheckedAt: now }, select: { id: true, preparationStatus: true, preparationNotes: true, preparationCheckedAt: true } });
    await audit(tx, employeeId, "RADIOLOGY_EXAM_PREPARATION_RECORDED", "RadiologyExam", examId, `Preparation outcome recorded as ${request.status}.`);
    return { ...updated, preparationCheckedAt: updated.preparationCheckedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export async function recordRadiologyPregnancyScreening(examId: string, employeeId: string, request: RadiologyPregnancyScreeningRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, "RADIOLOGY_STAFF");
    await lockRow(tx, "RadiologyExam", examId);
    const exam = await tx.radiologyExam.findUnique({ where: { id: examId }, select: { id: true, status: true, preparationStatus: true, orderItem: { select: { procedure: { select: { modality: true } } } }, pregnancyScreening: { select: { id: true, reviewDecision: true } }, identityVerifications: { where: { result: "VERIFIED" }, select: { id: true }, take: 1 } } });
    if (!exam || exam.status !== "SCHEDULED") fail("RADIOLOGY_EXAM_NOT_SCHEDULED", "Pregnancy screening can only be recorded for a scheduled exam.", 409);
    if (exam.orderItem.procedure.modality !== "DIGITAL_XRAY") fail("RADIOLOGY_PREGNANCY_SCREENING_NOT_APPLICABLE", "Exam-day pregnancy screening is required only for digital X-ray procedures.", 409);
    if (exam.identityVerifications.length === 0) fail("RADIOLOGY_IDENTITY_VERIFICATION_REQUIRED", "Verify the patient's identity before screening.", 409);
    if (exam.preparationStatus !== "CONFIRMED" && exam.preparationStatus !== "NOT_REQUIRED") fail("RADIOLOGY_PREPARATION_REQUIRED", "Complete the preparation check before pregnancy screening.", 409);
    if (exam.pregnancyScreening?.reviewDecision) fail("RADIOLOGY_PREGNANCY_REVIEW_LOCKED", "The Radiologist has already reviewed this screening. It cannot be overwritten.", 409);
    const now = new Date();
    const screening = await tx.radiologyPregnancyScreening.upsert({
      where: { examId },
      create: { examId, result: request.result, screeningNotes: request.notes ?? null, recordedByEmployeeId: employeeId, screenedAt: now },
      update: { result: request.result, screeningNotes: request.notes ?? null, recordedByEmployeeId: employeeId, screenedAt: now, reviewDecision: null, reviewNotes: null, reviewedByEmployeeId: null, reviewedAt: null },
      select: { id: true, result: true, screeningNotes: true, screenedAt: true },
    });
    await audit(tx, employeeId, "RADIOLOGY_PREGNANCY_SCREENING_RECORDED", "RadiologyPregnancyScreening", screening.id, `Exam-day X-ray screening recorded as ${request.result}.`);
    return { ...screening, screenedAt: screening.screenedAt.toISOString(), radiologistReviewRequired: request.result === "POSITIVE" || request.result === "DECLINED" };
  }, { isolationLevel: "Serializable" });
}

export async function reviewRadiologyPregnancyScreening(examId: string, employeeId: string, request: RadiologyPregnancyReviewRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, "RADIOLOGIST");
    await lockRow(tx, "RadiologyExam", examId);
    const exam = await tx.radiologyExam.findUnique({ where: { id: examId }, select: { id: true, status: true, orderItemId: true, orderItem: { select: { radiologyOrderId: true } }, pregnancyScreening: { select: { id: true, result: true, reviewDecision: true } } } });
    if (!exam || exam.status !== "SCHEDULED" || !exam.pregnancyScreening) fail("RADIOLOGY_PREGNANCY_SCREENING_NOT_FOUND", "A scheduled X-ray exam with a recorded pregnancy screening is required.", 404);
    if (!requiresRadiologistPregnancyReview(exam.pregnancyScreening.result)) fail("RADIOLOGY_PREGNANCY_REVIEW_NOT_REQUIRED", "Radiologist review is only required for positive or declined screening responses.", 409);
    if (exam.pregnancyScreening.reviewDecision) fail("RADIOLOGY_PREGNANCY_ALREADY_REVIEWED", "This screening has already received a Radiologist decision.", 409);
    const now = new Date();
    const screening = await tx.radiologyPregnancyScreening.update({ where: { id: exam.pregnancyScreening.id }, data: { reviewDecision: request.decision, reviewNotes: request.notes, reviewedByEmployeeId: employeeId, reviewedAt: now }, select: { id: true, result: true, reviewDecision: true, reviewNotes: true, reviewedAt: true } });
    if (request.decision === "DEFER_EXAM") {
      await tx.radiologyExam.update({ where: { id: examId }, data: { status: "CANCELLED", notes: `Deferred by Radiologist: ${request.notes}` } });
      await tx.radiologyOrderItem.update({ where: { id: exam.orderItemId }, data: { status: "CANCELLED" } });
      const remaining = await tx.radiologyOrderItem.count({ where: { radiologyOrderId: exam.orderItem.radiologyOrderId, status: { not: "CANCELLED" } } });
      if (remaining === 0) await tx.radiologyOrder.update({ where: { id: exam.orderItem.radiologyOrderId }, data: { status: "CANCELLED", cancelledAt: now, cancellationReason: "All ordered items were deferred by Radiologist review." } });
    }
    await audit(tx, employeeId, "RADIOLOGY_PREGNANCY_SCREENING_REVIEWED", "RadiologyPregnancyScreening", screening.id, `Radiologist decision: ${request.decision}.`);
    return { ...screening, reviewedAt: screening.reviewedAt?.toISOString() ?? null, examDeferred: request.decision === "DEFER_EXAM" };
  }, { isolationLevel: "Serializable" });
}

export async function getRadiologyExamReadiness(examId: string, employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => { await requireRole(tx, employeeId, "RADIOLOGY_STAFF"); });
  const exam = await prisma.radiologyExam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      status: true,
      preparationStatus: true,
      orderItem: {
        select: {
          status: true,
          procedure: { select: { modality: true } },
          radiologyOrder: {
            select: {
              encounter: {
                select: {
                  patient: { select: { mrn: true, firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      },
      identityVerifications: { where: { result: "VERIFIED" }, orderBy: [{ verifiedAt: "desc" }], take: 1, select: { verifiedAt: true } },
      pregnancyScreening: { select: { result: true, reviewDecision: true, reviewNotes: true } },
    },
  });
  if (!exam) fail("RADIOLOGY_EXAM_NOT_FOUND", "The radiology exam was not found.", 404);
  const readiness = decideRadiologyReadiness({
    examStatus: exam.status,
    itemStatus: exam.orderItem.status,
    identityVerified: exam.identityVerifications.length > 0,
    preparationStatus: exam.preparationStatus,
    modality: exam.orderItem.procedure.modality,
    pregnancyResult: exam.pregnancyScreening?.result ?? null,
    radiologistDecision: exam.pregnancyScreening?.reviewDecision ?? null,
  });
  return {
    examId,
    patient: { mrn: exam.orderItem.radiologyOrder.encounter.patient.mrn, displayName: `${exam.orderItem.radiologyOrder.encounter.patient.firstName} ${exam.orderItem.radiologyOrder.encounter.patient.lastName}` },
    modality: exam.orderItem.procedure.modality,
    ...readiness,
    radiologistDecision: exam.pregnancyScreening?.reviewDecision ?? null,
    canStartInPhase8I: readiness.canStart,
  };
}

export function mapRadiologyWorkflowError(error: unknown): unknown {
  if (error instanceof RadiologyWorkflowError) return error;
  if (typeof error === "object" && error !== null && "code" in error && (error.code === "P2002" || error.code === "P2034")) {
    return new RadiologyWorkflowError("RADIOLOGY_RESOURCE_CONFLICT", "Another scheduling operation changed this record. Refresh and try again.", 409);
  }
  return error;
}
