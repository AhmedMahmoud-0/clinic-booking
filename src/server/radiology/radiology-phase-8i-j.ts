import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { decideRadiologyReadiness } from "./radiology-workflow-policy";
import {
  decideDoctorRadiologyClinicalReview,
  decideExternalRadiologyTransition,
  decideRadiologyCriticalAcknowledgement,
  decideRadiologyCriticalCommunication,
  decideRadiologyCriticalEscalation,
  decideRadiologyExamCompletion,
  decideRadiologyExamStart,
  decideRadiologyReportRelease,
  decideRadiologyReportReview,
  decideRadiologyReportSubmission,
} from "./radiology-phase-8i-j-policy";
import type {
  DoctorRadiologyClinicalReviewRequest,
  ExternalRadiologyReferralRequest,
  ExternalRadiologyResultRequest,
  ExternalRadiologyReviewRequest,
  RadiologyCriticalAcknowledgementRequest,
  RadiologyCriticalCommunicationRequest,
  RadiologyCriticalEscalationRequest,
  RadiologyExamCompletionRequest,
  RadiologyReportDraftRequest,
  RadiologyReportReviewRequest,
} from "./radiology-phase-8i-j-validation";

export class RadiologyPhaseWorkflowError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "RadiologyPhaseWorkflowError";
    this.code = code;
    this.status = status;
  }
}

type Tx = Prisma.TransactionClient;
type Role = "RADIOLOGY_STAFF" | "RADIOLOGIST" | "DOCTOR";
function fail(code: string, message: string, status = 409): never {
  throw new RadiologyPhaseWorkflowError(code, message, status);
}
const reference = (prefix: string) => `${prefix}-${randomBytes(6).toString("hex").toUpperCase()}`;

async function resolveEmployee(tx: Tx, employeeId: string) {
  const employee = await tx.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      status: true,
      roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } },
      doctorProfile: { select: { id: true } },
    },
  });
  if (!employee || employee.status !== "ACTIVE") fail("RADIOLOGY_EMPLOYEE_REQUIRED", "An active employee assignment is required.", 403);
  return employee;
}

async function requireRole(tx: Tx, employeeId: string, roles: Role[]) {
  const employee = await resolveEmployee(tx, employeeId);
  if (!employee.roleAssignments.some((assignment) => roles.includes(assignment.role as Role))) {
    fail("RADIOLOGY_WORKSPACE_ACCESS_REQUIRED", "The employee does not have access to this radiology action.", 403);
  }
  if (roles.includes("DOCTOR") && !employee.doctorProfile) {
    fail("DOCTOR_WORKSPACE_ACCESS_REQUIRED", "An active Doctor profile is required.", 403);
  }
  return employee;
}

async function audit(tx: Tx, employeeId: string, action: string, entityType: string, entityId: string, reason?: string) {
  await tx.auditLog.create({
    data: { actorType: "EMPLOYEE", actorEmployeeId: employeeId, action, entityType, entityId, reason: reason ?? null },
  });
}

async function lockExam(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "RadiologyExam" WHERE "id" = ${id} FOR UPDATE`;
  if (rows.length !== 1) fail("RADIOLOGY_EXAM_NOT_FOUND", "The radiology exam was not found.", 404);
}
async function lockOrderItem(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "RadiologyOrderItem" WHERE "id" = ${id} FOR UPDATE`;
  if (rows.length !== 1) fail("RADIOLOGY_ORDER_ITEM_NOT_FOUND", "The radiology order item was not found.", 404);
}
async function lockReport(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "RadiologyReport" WHERE "id" = ${id} FOR UPDATE`;
  if (rows.length !== 1) fail("RADIOLOGY_REPORT_NOT_FOUND", "The radiology report was not found.", 404);
}
async function lockCriticalCommunication(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "RadiologyCriticalCommunication" WHERE "id" = ${id} FOR UPDATE`;
  if (rows.length !== 1) fail("RADIOLOGY_CRITICAL_COMMUNICATION_NOT_FOUND", "The critical communication was not found.", 404);
}
async function lockExternalReferral(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "ExternalRadiologyReferral" WHERE "id" = ${id} FOR UPDATE`;
  if (rows.length !== 1) fail("EXTERNAL_RADIOLOGY_REFERRAL_NOT_FOUND", "The external radiology referral was not found.", 404);
}

const executionExamSelect = {
  id: true,
  status: true,
  orderItemId: true,
  startedAt: true,
  preparationStatus: true,
  orderItem: {
    select: {
      id: true,
      status: true,
      radiologyOrderId: true,
      procedure: { select: { name: true, modality: true } },
      radiologyOrder: { select: { id: true, status: true } },
    },
  },
  identityVerifications: { where: { result: "VERIFIED" }, orderBy: [{ verifiedAt: "desc" }], take: 1, select: { id: true } },
  pregnancyScreening: { select: { result: true, reviewDecision: true } },
} satisfies Prisma.RadiologyExamSelect;

function getExecutionReadiness(exam: Prisma.RadiologyExamGetPayload<{ select: typeof executionExamSelect }>) {
  return decideRadiologyReadiness({
    examStatus: exam.status,
    itemStatus: exam.orderItem.status,
    identityVerified: exam.identityVerifications.length > 0,
    preparationStatus: exam.preparationStatus,
    modality: exam.orderItem.procedure.modality,
    pregnancyResult: exam.pregnancyScreening?.result ?? null,
    radiologistDecision: exam.pregnancyScreening?.reviewDecision ?? null,
  });
}

export async function getRadiologyExecutionWorklist(employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => { await requireRole(tx, employeeId, ["RADIOLOGY_STAFF"]); });
  const exams = await prisma.radiologyExam.findMany({
    where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] }, orderItem: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } } },
    orderBy: [{ scheduledStartsAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true, status: true, scheduledStartsAt: true, scheduledEndsAt: true, startedAt: true,
      resource: { select: { code: true, name: true, location: true, modality: true } },
      orderItem: { select: {
        id: true, status: true,
        procedure: { select: { code: true, name: true, modality: true } },
        radiologyOrder: { select: {
          orderReference: true, priority: true,
          encounter: { select: { patient: { select: { mrn: true, firstName: true, lastName: true } } } },
        } },
      } },
    },
  });
  return {
    items: exams.map((exam) => ({
      id: exam.id,
      status: exam.status,
      scheduledStartsAt: exam.scheduledStartsAt?.toISOString() ?? null,
      scheduledEndsAt: exam.scheduledEndsAt?.toISOString() ?? null,
      startedAt: exam.startedAt?.toISOString() ?? null,
      resource: exam.resource,
      order: { reference: exam.orderItem.radiologyOrder.orderReference, priority: exam.orderItem.radiologyOrder.priority },
      procedure: exam.orderItem.procedure,
      patient: {
        mrn: exam.orderItem.radiologyOrder.encounter.patient.mrn,
        displayName: `${exam.orderItem.radiologyOrder.encounter.patient.firstName} ${exam.orderItem.radiologyOrder.encounter.patient.lastName}`,
      },
    })),
    limit: 100,
  };
}

export async function startRadiologyExam(examId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, ["RADIOLOGY_STAFF"]);
    await lockExam(tx, examId);
    const exam = await tx.radiologyExam.findUnique({ where: { id: examId }, select: executionExamSelect });
    if (!exam) fail("RADIOLOGY_EXAM_NOT_FOUND", "The radiology exam was not found.", 404);
    const readiness = getExecutionReadiness(exam);
    const decision = decideRadiologyExamStart({
      examStatus: exam.status,
      itemStatus: exam.orderItem.status,
      orderStatus: exam.orderItem.radiologyOrder.status,
      readinessPassed: readiness.canStart,
    });
    if (decision.kind === "REJECT") {
      const message = decision.code === "RADIOLOGY_EXAM_NOT_READY"
        ? "The exam cannot start until identity, preparation, and any required X-ray review are complete."
        : decision.code === "RADIOLOGY_ORDER_NOT_ACTIVE"
          ? "The parent radiology order is not active for execution."
          : "Only a scheduled and ready exam can be started.";
      fail(decision.code, message, 409);
    }
    await lockOrderItem(tx, exam.orderItemId);
    const now = new Date();
    const updated = await tx.radiologyExam.update({
      where: { id: examId }, data: { status: "IN_PROGRESS", startedAt: now },
      select: { id: true, status: true, startedAt: true },
    });
    await tx.radiologyOrderItem.update({ where: { id: exam.orderItemId }, data: { status: "IN_PROGRESS" } });
    await tx.radiologyOrder.update({ where: { id: exam.orderItem.radiologyOrder.id }, data: { status: "IN_PROGRESS" } });
    await audit(tx, employeeId, "RADIOLOGY_EXAM_STARTED", "RadiologyExam", examId, "Execution started after the server-side readiness gate passed.");
    return { ...updated, startedAt: updated.startedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export async function completeRadiologyExam(examId: string, employeeId: string, request: RadiologyExamCompletionRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, ["RADIOLOGY_STAFF"]);
    await lockExam(tx, examId);
    const initial = await tx.radiologyExam.findUnique({ where: { id: examId }, select: { id: true, orderItemId: true } });
    if (!initial) fail("RADIOLOGY_EXAM_NOT_FOUND", "The radiology exam was not found.", 404);
    await lockOrderItem(tx, initial.orderItemId);
    const exam = await tx.radiologyExam.findUnique({
      where: { id: examId },
      select: { id: true, status: true, orderItemId: true, orderItem: { select: { id: true, status: true, radiologyOrderId: true } } },
    });
    if (!exam) fail("RADIOLOGY_EXAM_NOT_FOUND", "The radiology exam was not found.", 404);
    const decision = decideRadiologyExamCompletion({ examStatus: exam.status, itemStatus: exam.orderItem.status });
    if (decision.kind === "REJECT") fail(decision.code, "Only an in-progress exam can be completed.", 409);
    const now = new Date();
    const updated = await tx.radiologyExam.update({
      where: { id: examId },
      data: { status: "COMPLETED", performedAt: now, performedByEmployeeId: employeeId, ...(request.notes !== undefined ? { notes: request.notes } : {}) },
      select: { id: true, status: true, performedAt: true, performedByEmployeeId: true },
    });
    await tx.radiologyOrderItem.update({ where: { id: exam.orderItemId }, data: { status: "COMPLETED" } });
    const remaining = await tx.radiologyOrderItem.count({ where: { radiologyOrderId: exam.orderItem.radiologyOrderId, status: { notIn: ["COMPLETED", "CANCELLED"] } } });
    if (remaining === 0) {
      await tx.radiologyOrder.update({ where: { id: exam.orderItem.radiologyOrderId }, data: { status: "COMPLETED", completedAt: now } });
    } else {
      await tx.radiologyOrder.update({ where: { id: exam.orderItem.radiologyOrderId }, data: { status: "IN_PROGRESS" } });
    }
    await audit(tx, employeeId, "RADIOLOGY_EXAM_COMPLETED", "RadiologyExam", examId, "Exam completion recorded by the assigned Radiology Staff operator.");
    return { ...updated, performedAt: updated.performedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export async function createRadiologyReportDraft(examId: string, employeeId: string, request: RadiologyReportDraftRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, ["RADIOLOGIST"]);
    await lockExam(tx, examId);
    const exam = await tx.radiologyExam.findUnique({ where: { id: examId }, select: { id: true, status: true, report: { select: { id: true } } } });
    if (!exam) fail("RADIOLOGY_EXAM_NOT_FOUND", "The radiology exam was not found.", 404);
    if (exam.status !== "COMPLETED") fail("RADIOLOGY_EXAM_NOT_COMPLETED", "A report can only be drafted after the examination is completed.", 409);
    if (exam.report) fail("RADIOLOGY_REPORT_ALREADY_EXISTS", "A report draft already exists for this exam. Update that draft instead.", 409);
    const report = await tx.radiologyReport.create({
      data: {
        examId,
        findings: request.findings,
        impression: request.impression,
        recommendations: request.recommendations ?? null,
        isCritical: request.isCritical,
        criticalReason: request.isCritical ? request.criticalReason ?? null : null,
        authoredByEmployeeId: employeeId,
      },
      select: { id: true, status: true, findings: true, impression: true, isCritical: true, criticalReason: true, authoredAt: true },
    });
    await audit(tx, employeeId, "RADIOLOGY_REPORT_DRAFT_CREATED", "RadiologyReport", report.id, request.isCritical ? "Draft created and marked critical with a documented reason." : undefined);
    return { ...report, authoredAt: report.authoredAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function updateRadiologyReportDraft(reportId: string, employeeId: string, request: RadiologyReportDraftRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, ["RADIOLOGIST"]);
    await lockReport(tx, reportId);
    const current = await tx.radiologyReport.findUnique({ where: { id: reportId }, select: { id: true, status: true, authoredByEmployeeId: true } });
    if (!current) fail("RADIOLOGY_REPORT_NOT_FOUND", "The radiology report was not found.", 404);
    if (current.authoredByEmployeeId !== employeeId) fail("RADIOLOGY_REPORT_AUTHOR_REQUIRED", "Only the original report author can update this draft.", 403);
    if (current.status !== "DRAFT") fail("RADIOLOGY_REPORT_NOT_DRAFT", "Only a draft report can be edited. Submit or review state must not be overwritten.", 409);
    const updated = await tx.radiologyReport.update({
      where: { id: reportId },
      data: {
        findings: request.findings,
        impression: request.impression,
        recommendations: request.recommendations ?? null,
        isCritical: request.isCritical,
        criticalReason: request.isCritical ? request.criticalReason ?? null : null,
      },
      select: { id: true, status: true, findings: true, impression: true, recommendations: true, isCritical: true, criticalReason: true, updatedAt: true },
    });
    await audit(tx, employeeId, "RADIOLOGY_REPORT_DRAFT_UPDATED", "RadiologyReport", reportId);
    return { ...updated, updatedAt: updated.updatedAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function submitRadiologyReportForReview(reportId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, ["RADIOLOGIST"]);
    await lockReport(tx, reportId);
    const report = await tx.radiologyReport.findUnique({ where: { id: reportId }, select: { id: true, status: true, authoredByEmployeeId: true, findings: true, impression: true, isCritical: true, criticalReason: true } });
    if (!report) fail("RADIOLOGY_REPORT_NOT_FOUND", "The radiology report was not found.", 404);
    const decision = decideRadiologyReportSubmission({
      status: report.status,
      authorEmployeeId: report.authoredByEmployeeId,
      actorEmployeeId: employeeId,
      hasFindings: Boolean(report.findings.trim()),
      hasImpression: Boolean(report.impression.trim()),
      criticalReasonValid: !report.isCritical || Boolean(report.criticalReason?.trim()),
    });
    if (decision.kind === "REJECT") fail(decision.code, "The report cannot be submitted in its current state or is missing required content.", decision.code === "RADIOLOGY_REPORT_AUTHOR_REQUIRED" ? 403 : 409);
    const updated = await tx.radiologyReport.update({ where: { id: reportId }, data: { status: "PENDING_APPROVAL" }, select: { id: true, status: true, updatedAt: true } });
    await audit(tx, employeeId, "RADIOLOGY_REPORT_SUBMITTED", "RadiologyReport", reportId);
    return { ...updated, submittedAt: updated.updatedAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function getRadiologyReportReviewWorklist(employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => { await requireRole(tx, employeeId, ["RADIOLOGIST"]); });
  const reports = await prisma.radiologyReport.findMany({
    where: { status: "PENDING_APPROVAL" },
    orderBy: [{ authoredAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      findings: true,
      impression: true,
      isCritical: true,
      criticalReason: true,
      authoredAt: true,
      authoredByEmployee: { select: { firstName: true, lastName: true } },
      exam: {
        select: {
          performedAt: true,
          orderItem: {
            select: {
              procedure: { select: { code: true, name: true, modality: true } },
              radiologyOrder: {
                select: {
                  orderReference: true,
                  encounter: {
                    select: {
                      patient: { select: { mrn: true, firstName: true, lastName: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return {
    items: reports.map((report) => ({
      id: report.id, status: report.status, findings: report.findings, impression: report.impression,
      isCritical: report.isCritical, criticalReason: report.criticalReason,
      authoredAt: report.authoredAt.toISOString(),
      author: `${report.authoredByEmployee.firstName} ${report.authoredByEmployee.lastName}`,
      performedAt: report.exam.performedAt?.toISOString() ?? null,
      orderReference: report.exam.orderItem.radiologyOrder.orderReference,
      procedure: report.exam.orderItem.procedure,
      patient: {
        mrn: report.exam.orderItem.radiologyOrder.encounter.patient.mrn,
        displayName: `${report.exam.orderItem.radiologyOrder.encounter.patient.firstName} ${report.exam.orderItem.radiologyOrder.encounter.patient.lastName}`,
      },
    })),
    limit: 100,
  };
}

export async function reviewRadiologyReport(reportId: string, employeeId: string, request: RadiologyReportReviewRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, ["RADIOLOGIST"]);
    await lockReport(tx, reportId);
    const report = await tx.radiologyReport.findUnique({ where: { id: reportId }, select: { id: true, status: true, authoredByEmployeeId: true } });
    if (!report) fail("RADIOLOGY_REPORT_NOT_FOUND", "The radiology report was not found.", 404);
    const decision = decideRadiologyReportReview({ status: report.status, authorEmployeeId: report.authoredByEmployeeId, reviewerEmployeeId: employeeId });
    if (decision.kind === "REJECT") fail(decision.code, "The report is not awaiting review or the author cannot approve their own report.", decision.code === "RADIOLOGY_REPORT_SELF_REVIEW_FORBIDDEN" ? 403 : 409);
    const now = new Date();
    const review = await tx.radiologyReportReview.create({
      data: { reportId, reviewerEmployeeId: employeeId, decision: request.decision, comments: request.comments ?? null, reviewedAt: now },
      select: { id: true, decision: true, comments: true, reviewedAt: true },
    });
    const approved = request.decision === "APPROVED";
    await tx.radiologyReport.update({
      where: { id: reportId },
      data: approved
        ? { status: "APPROVED", approvedByEmployeeId: employeeId, approvedAt: now }
        : { status: "DRAFT", approvedByEmployeeId: null, approvedAt: null },
    });
    await audit(tx, employeeId, approved ? "RADIOLOGY_REPORT_APPROVED" : "RADIOLOGY_REPORT_CHANGES_REQUESTED", "RadiologyReport", reportId, request.comments ?? undefined);
    return { ...review, reviewedAt: review.reviewedAt.toISOString(), reportStatus: approved ? "APPROVED" as const : "DRAFT" as const };
  }, { isolationLevel: "Serializable" });
}

const reportReleaseSelect = {
  id: true,
  status: true,
  isCritical: true,
  criticalCommunications: { select: { status: true, readBackConfirmedAt: true } },
  exam: {
    select: {
      orderItem: {
        select: {
          radiologyOrder: {
            select: {
              encounter: {
                select: {
                  doctor: { select: { employeeId: true } },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RadiologyReportSelect;

export async function releaseRadiologyReport(reportId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, ["RADIOLOGIST"]);
    await lockReport(tx, reportId);
    const report = await tx.radiologyReport.findUnique({ where: { id: reportId }, select: reportReleaseSelect });
    if (!report) fail("RADIOLOGY_REPORT_NOT_FOUND", "The radiology report was not found.", 404);
    const allAcknowledged = report.criticalCommunications.length > 0
      && report.criticalCommunications.every((communication) => communication.status === "ACKNOWLEDGED" && communication.readBackConfirmedAt !== null);
    const decision = decideRadiologyReportRelease({
      status: report.status,
      isCritical: report.isCritical,
      communicationCount: report.criticalCommunications.length,
      everyCommunicationAcknowledged: allAcknowledged,
    });
    if (decision.kind === "REJECT") fail(decision.code, "The report must be approved, and a critical report requires completed ordering-Doctor read-back before release.", 409);
    const now = new Date();
    const updated = await tx.radiologyReport.update({ where: { id: reportId }, data: { status: "RELEASED", releasedAt: now }, select: { id: true, status: true, releasedAt: true } });
    const doctorEmployeeId = report.exam.orderItem.radiologyOrder.encounter.doctor.employeeId;
    await tx.notification.create({
      data: {
        employeeId: doctorEmployeeId,
        channel: "IN_APP",
        title: "Radiology report available",
        message: "A radiology report is available in the assigned Encounter workspace.",
        actionPath: `/doctor/radiology-reports/${reportId}`,
      },
    });
    await audit(tx, employeeId, "RADIOLOGY_REPORT_RELEASED", "RadiologyReport", reportId, "Released to the assigned Doctor through protected clinical access.");
    return { ...updated, releasedAt: updated.releasedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

const criticalReportContextSelect = {
  id: true,
  status: true,
  isCritical: true,
  exam: {
    select: {
      orderItem: {
        select: {
          radiologyOrder: {
            select: {
              encounter: {
                select: {
                  doctor: { select: { employeeId: true } },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RadiologyReportSelect;

export async function createRadiologyCriticalCommunication(reportId: string, employeeId: string, request: RadiologyCriticalCommunicationRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, ["RADIOLOGY_STAFF", "RADIOLOGIST"]);
    await lockReport(tx, reportId);
    const report = await tx.radiologyReport.findUnique({ where: { id: reportId }, select: criticalReportContextSelect });
    if (!report) fail("RADIOLOGY_REPORT_NOT_FOUND", "The radiology report was not found.", 404);
    const decision = decideRadiologyCriticalCommunication({ reportStatus: report.status, isCritical: report.isCritical });
    if (decision.kind === "REJECT") fail(decision.code, "Critical communication can only be recorded for an approved report explicitly marked critical.", 409);
    const doctorEmployeeId = report.exam.orderItem.radiologyOrder.encounter.doctor.employeeId;
    const now = new Date();
    const communication = await tx.radiologyCriticalCommunication.create({
      data: {
        reportId, status: "NOTIFIED", method: request.method, communicatedToName: request.communicatedToName,
        readBackRequired: true, notifiedByEmployeeId: employeeId, notifiedAt: now,
      },
      select: { id: true, status: true, method: true, communicatedToName: true, notifiedAt: true },
    });
    await tx.notification.create({
      data: {
        employeeId: doctorEmployeeId,
        channel: "IN_APP",
        title: "Critical radiology result requires acknowledgement",
        message: "A critical radiology result communication is awaiting your read-back acknowledgement.",
        actionPath: `/doctor/radiology-reports/${reportId}`,
      },
    });
    await audit(tx, employeeId, "RADIOLOGY_CRITICAL_RESULT_NOTIFIED", "RadiologyCriticalCommunication", communication.id, "Critical-result communication recorded; ordering-Doctor read-back is required.");
    return { ...communication, notifiedAt: communication.notifiedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

const criticalCommunicationSelect = {
  id: true,
  status: true,
  readBackRequired: true,
  report: {
    select: {
      id: true,
      status: true,
      exam: {
        select: {
          orderItem: {
            select: {
              radiologyOrder: {
                select: {
                  encounter: { select: { doctorId: true } },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RadiologyCriticalCommunicationSelect;

export async function acknowledgeRadiologyCriticalCommunication(communicationId: string, employeeId: string, request: RadiologyCriticalAcknowledgementRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRole(tx, employeeId, ["DOCTOR"]);
    await lockCriticalCommunication(tx, communicationId);
    const communication = await tx.radiologyCriticalCommunication.findUnique({ where: { id: communicationId }, select: criticalCommunicationSelect });
    if (!communication) fail("RADIOLOGY_CRITICAL_COMMUNICATION_NOT_FOUND", "The critical communication was not found.", 404);
    const decision = decideRadiologyCriticalAcknowledgement({
      status: communication.status,
      readBackRequired: communication.readBackRequired,
      readBackConfirmed: request.readBackConfirmed,
      isOrderingDoctor: employee.doctorProfile?.id === communication.report.exam.orderItem.radiologyOrder.encounter.doctorId,
    });
    if (decision.kind === "REJECT") fail(decision.code, "Only the assigned ordering Doctor can acknowledge an open communication after confirming read-back.", decision.code === "RADIOLOGY_CRITICAL_DOCTOR_REQUIRED" ? 403 : 409);
    const now = new Date();
    const updated = await tx.radiologyCriticalCommunication.update({
      where: { id: communicationId },
      data: {
        status: "ACKNOWLEDGED", acknowledgedByEmployeeId: employeeId, acknowledgedAt: now, readBackConfirmedAt: now,
        ...(request.resolutionNotes !== undefined ? { resolutionNotes: request.resolutionNotes } : {}),
      },
      select: { id: true, status: true, acknowledgedAt: true, readBackConfirmedAt: true },
    });
    await audit(tx, employeeId, "RADIOLOGY_CRITICAL_RESULT_ACKNOWLEDGED", "RadiologyCriticalCommunication", communicationId, "Ordering Doctor confirmed the critical-result read-back.");
    return { ...updated, acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null, readBackConfirmedAt: updated.readBackConfirmedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export async function escalateRadiologyCriticalCommunication(communicationId: string, employeeId: string, request: RadiologyCriticalEscalationRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, ["RADIOLOGY_STAFF", "RADIOLOGIST"]);
    await lockCriticalCommunication(tx, communicationId);
    const communication = await tx.radiologyCriticalCommunication.findUnique({ where: { id: communicationId }, select: { id: true, status: true } });
    if (!communication) fail("RADIOLOGY_CRITICAL_COMMUNICATION_NOT_FOUND", "The critical communication was not found.", 404);
    const decision = decideRadiologyCriticalEscalation({ status: communication.status, hasReason: Boolean(request.reason.trim()) });
    if (decision.kind === "REJECT") fail(decision.code, "Only a notified and unacknowledged communication can be escalated with a reason.", 409);
    const now = new Date();
    const updated = await tx.radiologyCriticalCommunication.update({
      where: { id: communicationId }, data: { status: "ESCALATED", escalatedAt: now, resolutionNotes: request.reason },
      select: { id: true, status: true, escalatedAt: true },
    });
    await audit(tx, employeeId, "RADIOLOGY_CRITICAL_RESULT_ESCALATED", "RadiologyCriticalCommunication", communicationId, "Critical-result communication escalated after no acknowledgement.");
    return { ...updated, escalatedAt: updated.escalatedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export async function getRadiologyCriticalCommunicationWorklist(employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => { await requireRole(tx, employeeId, ["RADIOLOGY_STAFF", "RADIOLOGIST"]); });
  const communications = await prisma.radiologyCriticalCommunication.findMany({
    where: { status: { in: ["NOTIFIED", "ESCALATED"] } },
    orderBy: [{ notifiedAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      method: true,
      communicatedToName: true,
      notifiedAt: true,
      escalatedAt: true,
      report: {
        select: {
          id: true,
          exam: {
            select: {
              orderItem: {
                select: {
                  procedure: { select: { code: true, name: true, modality: true } },
                  radiologyOrder: {
                    select: {
                      orderReference: true,
                      encounter: {
                        select: {
                          patient: { select: { mrn: true, firstName: true, lastName: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return {
    items: communications.map((communication) => ({
      id: communication.id, status: communication.status, method: communication.method,
      communicatedToName: communication.communicatedToName,
      notifiedAt: communication.notifiedAt?.toISOString() ?? null,
      escalatedAt: communication.escalatedAt?.toISOString() ?? null,
      reportId: communication.report.id,
      orderReference: communication.report.exam.orderItem.radiologyOrder.orderReference,
      procedure: communication.report.exam.orderItem.procedure,
      patient: {
        mrn: communication.report.exam.orderItem.radiologyOrder.encounter.patient.mrn,
        displayName: `${communication.report.exam.orderItem.radiologyOrder.encounter.patient.firstName} ${communication.report.exam.orderItem.radiologyOrder.encounter.patient.lastName}`,
      },
    })),
    limit: 100,
  };
}

const doctorReportSelect = {
  id: true,
  status: true,
  findings: true,
  impression: true,
  recommendations: true,
  isCritical: true,
  criticalReason: true,
  authoredAt: true,
  approvedAt: true,
  releasedAt: true,
  authoredByEmployee: { select: { firstName: true, lastName: true } },
  approvedByEmployee: { select: { firstName: true, lastName: true } },
  exam: {
    select: {
      performedAt: true,
      orderItem: {
        select: {
          procedure: { select: { code: true, name: true, modality: true } },
          radiologyOrder: {
            select: {
              orderReference: true,
              encounter: {
                select: {
                  id: true,
                  doctorId: true,
                  patient: { select: { mrn: true, firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  reviews: {
    orderBy: [{ reviewedAt: "desc" }],
    take: 10,
    select: {
      decision: true,
      comments: true,
      reviewedAt: true,
      reviewer: { select: { firstName: true, lastName: true } },
    },
  },
  criticalCommunications: {
    orderBy: [{ notifiedAt: "asc" }],
    select: {
      id: true,
      status: true,
      method: true,
      communicatedToName: true,
      notifiedAt: true,
      escalatedAt: true,
      readBackRequired: true,
      readBackConfirmedAt: true,
    },
  },
} satisfies Prisma.RadiologyReportSelect;

export async function getDoctorRadiologyReport(reportId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRole(tx, employeeId, ["DOCTOR"]);
    const report = await tx.radiologyReport.findUnique({ where: { id: reportId }, select: doctorReportSelect });
    if (!report || report.exam.orderItem.radiologyOrder.encounter.doctorId !== employee.doctorProfile?.id) {
      fail("RADIOLOGY_REPORT_NOT_FOUND", "The radiology report was not found for this Doctor.", 404);
    }
    const mayViewPreReleaseCritical = report.status === "APPROVED" && report.isCritical && report.criticalCommunications.length > 0;
    if (report.status !== "RELEASED" && !mayViewPreReleaseCritical) {
      fail("RADIOLOGY_REPORT_NOT_RELEASED", "Only released reports are available, except an approved critical report with an open read-back request for the ordering Doctor.", 409);
    }
    return {
      id: report.id, status: report.status, findings: report.findings, impression: report.impression,
      recommendations: report.recommendations, isCritical: report.isCritical, criticalReason: report.criticalReason,
      authoredAt: report.authoredAt.toISOString(), approvedAt: report.approvedAt?.toISOString() ?? null, releasedAt: report.releasedAt?.toISOString() ?? null,
      author: `${report.authoredByEmployee.firstName} ${report.authoredByEmployee.lastName}`,
      approver: report.approvedByEmployee ? `${report.approvedByEmployee.firstName} ${report.approvedByEmployee.lastName}` : null,
      performedAt: report.exam.performedAt?.toISOString() ?? null,
      orderReference: report.exam.orderItem.radiologyOrder.orderReference,
      procedure: report.exam.orderItem.procedure,
      patient: {
        mrn: report.exam.orderItem.radiologyOrder.encounter.patient.mrn,
        displayName: `${report.exam.orderItem.radiologyOrder.encounter.patient.firstName} ${report.exam.orderItem.radiologyOrder.encounter.patient.lastName}`,
      },
      recentReviews: report.reviews.map((review) => ({
        decision: review.decision, comments: review.comments,
        reviewedAt: review.reviewedAt.toISOString(), reviewer: `${review.reviewer.firstName} ${review.reviewer.lastName}`,
      })),
      criticalCommunications: report.criticalCommunications.map((communication) => ({
        ...communication,
        readBackConfirmedAt: communication.readBackConfirmedAt?.toISOString() ?? null,
        notifiedAt: communication.notifiedAt?.toISOString() ?? null,
        escalatedAt: communication.escalatedAt?.toISOString() ?? null,
      })),
    };
  });
}

export async function recordDoctorRadiologyClinicalReview(reportId: string, employeeId: string, request: DoctorRadiologyClinicalReviewRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRole(tx, employeeId, ["DOCTOR"]);
    await lockReport(tx, reportId);
    const report = await tx.radiologyReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        status: true,
        exam: {
          select: {
            orderItem: {
              select: {
                radiologyOrder: {
                  select: {
                    encounter: { select: { doctorId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!report) fail("RADIOLOGY_REPORT_NOT_FOUND", "The radiology report was not found.", 404);
    const decision = decideDoctorRadiologyClinicalReview({
      reportStatus: report.status,
      isOrderingDoctor: report.exam.orderItem.radiologyOrder.encounter.doctorId === employee.doctorProfile?.id,
    });
    if (decision.kind === "REJECT") fail(decision.code, "Only the assigned Doctor can clinically review a released radiology report.", decision.code === "RADIOLOGY_CLINICAL_REVIEW_DOCTOR_REQUIRED" ? 403 : 409);
    const now = new Date();
    const review = await tx.radiologyClinicalReview.upsert({
      where: { reportId_reviewerEmployeeId: { reportId, reviewerEmployeeId: employeeId } },
      create: { reportId, reviewerEmployeeId: employeeId, decision: request.decision, notes: request.notes ?? null, reviewedAt: now },
      update: { decision: request.decision, notes: request.notes ?? null, reviewedAt: now },
      select: { id: true, decision: true, notes: true, reviewedAt: true },
    });
    await audit(tx, employeeId, request.decision === "FOLLOW_UP_REQUIRED" ? "RADIOLOGY_REPORT_FOLLOW_UP_REQUIRED" : "RADIOLOGY_REPORT_CLINICALLY_REVIEWED", "RadiologyClinicalReview", review.id, "Assigned Doctor recorded a clinical review decision.");
    return { ...review, reviewedAt: review.reviewedAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function createExternalRadiologyReferral(encounterId: string, employeeId: string, request: ExternalRadiologyReferralRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRole(tx, employeeId, ["DOCTOR"]);
    const doctorId = employee.doctorProfile?.id;
    if (!doctorId) fail("DOCTOR_WORKSPACE_ACCESS_REQUIRED", "An active Doctor profile is required.", 403);
    const encounter = await tx.encounter.findFirst({
      where: { id: encounterId, doctorId, status: "IN_PROGRESS" },
      select: { id: true, patientId: true },
    });
    if (!encounter) fail("EXTERNAL_RADIOLOGY_ENCOUNTER_NOT_FOUND", "The active Encounter assigned to this Doctor was not found.", 404);
    if (request.consent.signerPatientId !== encounter.patientId) {
      const guardian = await tx.patientRelationship.findFirst({
        where: {
          patientId: encounter.patientId, relatedPatientId: request.consent.signerPatientId,
          isActive: true, isLegalGuardian: true, guardianVerifiedAt: { not: null }, guardianEvidenceType: { not: null },
        },
        select: { id: true },
      });
      if (request.consent.signerType !== "LEGAL_GUARDIAN" || !guardian) {
        fail("EXTERNAL_RADIOLOGY_GUARDIAN_NOT_VERIFIED", "A verified legal-guardian relationship is required for guardian consent.", 403);
      }
    } else if (request.consent.signerType !== "PATIENT") {
      fail("EXTERNAL_RADIOLOGY_CONSENT_SIGNER_INVALID", "The patient must be recorded as the consent signer.", 400);
    }
    const consent = await tx.patientConsent.create({
      data: {
        patientId: encounter.patientId, consentType: "EXTERNAL_DIAGNOSTIC_DATA_SHARING", decision: "GRANTED",
        captureMethod: request.consent.captureMethod, documentVersion: request.consent.documentVersion,
        signerPatientId: request.consent.signerPatientId, signerType: request.consent.signerType,
        signerNameSnapshot: request.consent.signerNameSnapshot, recordedByEmployeeId: employeeId,
      },
      select: { id: true },
    });
    const referral = await tx.externalRadiologyReferral.create({
      data: {
        referralReference: reference("ERR"), encounterId, procedureName: request.procedureName, reason: request.reason,
        externalFacilityName: request.externalFacilityName, externalFacilityContact: request.externalFacilityContact ?? null,
        consentId: consent.id, createdByEmployeeId: employeeId,
      },
      select: { id: true, referralReference: true, status: true, referredAt: true },
    });
    await audit(tx, employeeId, "EXTERNAL_RADIOLOGY_REFERRAL_CREATED", "ExternalRadiologyReferral", referral.id, "Referral created with matching granted external diagnostic data-sharing consent.");
    return { ...referral, referredAt: referral.referredAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function listEncounterExternalRadiologyReferrals(encounterId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRole(tx, employeeId, ["DOCTOR"]);
    const doctorId = employee.doctorProfile?.id;
    if (!doctorId) fail("DOCTOR_WORKSPACE_ACCESS_REQUIRED", "An active Doctor profile is required.", 403);
    const encounter = await tx.encounter.findFirst({ where: { id: encounterId, doctorId }, select: { id: true } });
    if (!encounter) fail("EXTERNAL_RADIOLOGY_ENCOUNTER_NOT_FOUND", "The Encounter was not found for this Doctor.", 404);
    const items = await tx.externalRadiologyReferral.findMany({
      where: { encounterId }, orderBy: [{ referredAt: "desc" }, { id: "desc" }], take: 100,
      select: {
        id: true, referralReference: true, status: true, procedureName: true, reason: true,
        externalFacilityName: true, referredAt: true, resultReceivedAt: true, reviewDecision: true, reviewedAt: true,
      },
    });
    return { items: items.map((item) => ({
      ...item, referredAt: item.referredAt.toISOString(),
      resultReceivedAt: item.resultReceivedAt?.toISOString() ?? null, reviewedAt: item.reviewedAt?.toISOString() ?? null,
    })) };
  });
}

export async function getExternalRadiologyReferralWorklist(employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => { await requireRole(tx, employeeId, ["RADIOLOGY_STAFF"]); });
  const referrals = await prisma.externalRadiologyReferral.findMany({
    where: { status: "REFERRED" }, orderBy: [{ referredAt: "asc" }, { id: "asc" }], take: 100,
    select: {
      id: true, referralReference: true, procedureName: true, reason: true, externalFacilityName: true,
      externalFacilityContact: true, referredAt: true,
      encounter: { select: { patient: { select: { mrn: true, firstName: true, lastName: true } } } },
    },
  });
  return { items: referrals.map((referral) => ({
    id: referral.id, referralReference: referral.referralReference, procedureName: referral.procedureName,
    reason: referral.reason, externalFacilityName: referral.externalFacilityName,
    externalFacilityContact: referral.externalFacilityContact, referredAt: referral.referredAt.toISOString(),
    patient: { mrn: referral.encounter.patient.mrn, displayName: `${referral.encounter.patient.firstName} ${referral.encounter.patient.lastName}` },
  })), limit: 100 };
}

export async function receiveExternalRadiologyResult(referralId: string, employeeId: string, request: ExternalRadiologyResultRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRole(tx, employeeId, ["RADIOLOGY_STAFF"]);
    await lockExternalReferral(tx, referralId);
    const referral = await tx.externalRadiologyReferral.findUnique({
      where: { id: referralId }, select: { id: true, status: true, encounter: { select: { doctor: { select: { employeeId: true } } } } },
    });
    if (!referral) fail("EXTERNAL_RADIOLOGY_REFERRAL_NOT_FOUND", "The external radiology referral was not found.", 404);
    const decision = decideExternalRadiologyTransition({ status: referral.status, action: "RECEIVE_RESULT" });
    if (decision.kind === "REJECT") fail(decision.code, "Only a referred external imaging case can receive a result.", 409);
    const now = new Date();
    const received = await tx.externalRadiologyReferral.update({
      where: { id: referralId },
      data: {
        status: "RESULT_RECEIVED", resultFindings: request.findings, resultImpression: request.impression,
        resultRecommendations: request.recommendations ?? null,
        resultPerformedAt: request.performedAt ? new Date(request.performedAt) : null,
        resultReceivedAt: now, resultReceivedByEmployeeId: employeeId,
      },
      select: { id: true, status: true, resultReceivedAt: true },
    });
    await tx.notification.create({
      data: {
        employeeId: referral.encounter.doctor.employeeId, channel: "IN_APP",
        title: "External radiology result received",
        message: "An external radiology result is ready for review in the assigned Encounter workspace.",
        actionPath: `/doctor/external-radiology-referrals/${referralId}`,
      },
    });
    await audit(tx, employeeId, "EXTERNAL_RADIOLOGY_RESULT_RECEIVED", "ExternalRadiologyReferral", referralId, "External report text was received and stored in the protected Encounter workflow; no file upload or PACS connection was performed.");
    return { ...received, resultReceivedAt: received.resultReceivedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

const doctorExternalReferralSelect = {
  id: true, referralReference: true, status: true, procedureName: true, reason: true, externalFacilityName: true,
  resultFindings: true, resultImpression: true, resultRecommendations: true, resultPerformedAt: true, resultReceivedAt: true,
  reviewDecision: true, reviewNotes: true, reviewedAt: true,
  encounter: { select: { doctorId: true, patient: { select: { mrn: true, firstName: true, lastName: true } } } },
} satisfies Prisma.ExternalRadiologyReferralSelect;

export async function getDoctorExternalRadiologyReferral(referralId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRole(tx, employeeId, ["DOCTOR"]);
    const referral = await tx.externalRadiologyReferral.findUnique({ where: { id: referralId }, select: doctorExternalReferralSelect });
    if (!referral || referral.encounter.doctorId !== employee.doctorProfile?.id) {
      fail("EXTERNAL_RADIOLOGY_REFERRAL_NOT_FOUND", "The external radiology referral was not found for this Doctor.", 404);
    }
    return {
      id: referral.id, referralReference: referral.referralReference, status: referral.status,
      procedureName: referral.procedureName, reason: referral.reason, externalFacilityName: referral.externalFacilityName,
      resultFindings: referral.resultFindings, resultImpression: referral.resultImpression,
      resultRecommendations: referral.resultRecommendations,
      resultPerformedAt: referral.resultPerformedAt?.toISOString() ?? null,
      resultReceivedAt: referral.resultReceivedAt?.toISOString() ?? null,
      reviewDecision: referral.reviewDecision, reviewNotes: referral.reviewNotes,
      reviewedAt: referral.reviewedAt?.toISOString() ?? null,
      patient: { mrn: referral.encounter.patient.mrn, displayName: `${referral.encounter.patient.firstName} ${referral.encounter.patient.lastName}` },
    };
  });
}

export async function reviewExternalRadiologyResult(referralId: string, employeeId: string, request: ExternalRadiologyReviewRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRole(tx, employeeId, ["DOCTOR"]);
    await lockExternalReferral(tx, referralId);
    const referral = await tx.externalRadiologyReferral.findUnique({
      where: { id: referralId }, select: { id: true, status: true, encounter: { select: { doctorId: true } } },
    });
    if (!referral || referral.encounter.doctorId !== employee.doctorProfile?.id) {
      fail("EXTERNAL_RADIOLOGY_REFERRAL_NOT_FOUND", "The external radiology referral was not found for this Doctor.", 404);
    }
    const decision = decideExternalRadiologyTransition({ status: referral.status, action: "REVIEW_RESULT" });
    if (decision.kind === "REJECT") fail(decision.code, "Only a received external radiology result can be clinically reviewed.", 409);
    const now = new Date();
    const updated = await tx.externalRadiologyReferral.update({
      where: { id: referralId },
      data: { status: "REVIEWED", reviewDecision: request.decision, reviewNotes: request.notes ?? null, reviewedByEmployeeId: employeeId, reviewedAt: now },
      select: { id: true, status: true, reviewDecision: true, reviewNotes: true, reviewedAt: true },
    });
    await audit(tx, employeeId, request.decision === "FOLLOW_UP_REQUIRED" ? "EXTERNAL_RADIOLOGY_FOLLOW_UP_REQUIRED" : "EXTERNAL_RADIOLOGY_RESULT_REVIEWED", "ExternalRadiologyReferral", referralId, "Assigned Doctor recorded the clinical review of the external imaging result.");
    return { ...updated, reviewedAt: updated.reviewedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export function mapRadiologyPhaseWorkflowError(error: unknown): unknown {
  if (error instanceof RadiologyPhaseWorkflowError) return error;
  if (typeof error === "object" && error !== null && "code" in error && (error.code === "P2002" || error.code === "P2034" || error.code === "P2004" || error.code === "P2010")) {
    return new RadiologyPhaseWorkflowError("RADIOLOGY_CONCURRENT_CHANGE", "Another radiology operation changed this record. Refresh and try again.", 409);
  }
  return error;
}

export {
  radiologyPhaseRecordIdSchema,
  radiologyExamCompletionRequestSchema,
  radiologyReportDraftRequestSchema,
  radiologyReportReviewRequestSchema,
  radiologyCriticalCommunicationRequestSchema,
  radiologyCriticalAcknowledgementRequestSchema,
  radiologyCriticalEscalationRequestSchema,
  doctorRadiologyClinicalReviewRequestSchema,
  externalRadiologyReferralRequestSchema,
  externalRadiologyResultRequestSchema,
  externalRadiologyReviewRequestSchema,
} from "./radiology-phase-8i-j-validation";
