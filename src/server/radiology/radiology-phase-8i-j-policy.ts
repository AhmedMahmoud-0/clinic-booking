export type WorkflowDecision = { kind: "ALLOW" } | { kind: "REJECT"; code: string };

export function decideRadiologyExamStart(input: {
  examStatus: string;
  itemStatus: string;
  orderStatus: string;
  readinessPassed: boolean;
}): WorkflowDecision {
  if (input.examStatus !== "SCHEDULED" || input.itemStatus !== "SCHEDULED") return { kind: "REJECT", code: "RADIOLOGY_EXAM_NOT_SCHEDULED" };
  if (input.orderStatus !== "SCHEDULED" && input.orderStatus !== "IN_PROGRESS") return { kind: "REJECT", code: "RADIOLOGY_ORDER_NOT_ACTIVE" };
  if (!input.readinessPassed) return { kind: "REJECT", code: "RADIOLOGY_EXAM_NOT_READY" };
  return { kind: "ALLOW" };
}

export function decideRadiologyExamCompletion(input: { examStatus: string; itemStatus: string }): WorkflowDecision {
  if (input.examStatus !== "IN_PROGRESS" || input.itemStatus !== "IN_PROGRESS") return { kind: "REJECT", code: "RADIOLOGY_EXAM_NOT_IN_PROGRESS" };
  return { kind: "ALLOW" };
}

export function decideRadiologyReportSubmission(input: {
  status: string;
  authorEmployeeId: string;
  actorEmployeeId: string;
  hasFindings: boolean;
  hasImpression: boolean;
  criticalReasonValid: boolean;
}): WorkflowDecision {
  if (input.status !== "DRAFT") return { kind: "REJECT", code: "RADIOLOGY_REPORT_NOT_DRAFT" };
  if (input.authorEmployeeId !== input.actorEmployeeId) return { kind: "REJECT", code: "RADIOLOGY_REPORT_AUTHOR_REQUIRED" };
  if (!input.hasFindings || !input.hasImpression) return { kind: "REJECT", code: "RADIOLOGY_REPORT_CONTENT_REQUIRED" };
  if (!input.criticalReasonValid) return { kind: "REJECT", code: "RADIOLOGY_REPORT_CRITICAL_REASON_REQUIRED" };
  return { kind: "ALLOW" };
}

export function decideRadiologyReportReview(input: {
  status: string;
  authorEmployeeId: string;
  reviewerEmployeeId: string;
}): WorkflowDecision {
  if (input.status !== "PENDING_APPROVAL") return { kind: "REJECT", code: "RADIOLOGY_REPORT_NOT_PENDING_APPROVAL" };
  if (input.authorEmployeeId === input.reviewerEmployeeId) return { kind: "REJECT", code: "RADIOLOGY_REPORT_SELF_REVIEW_FORBIDDEN" };
  return { kind: "ALLOW" };
}

export function decideRadiologyReportRelease(input: {
  status: string;
  isCritical: boolean;
  communicationCount: number;
  everyCommunicationAcknowledged: boolean;
}): WorkflowDecision {
  if (input.status !== "APPROVED") return { kind: "REJECT", code: "RADIOLOGY_REPORT_NOT_APPROVED" };
  if (input.isCritical && (input.communicationCount === 0 || !input.everyCommunicationAcknowledged)) {
    return { kind: "REJECT", code: "RADIOLOGY_CRITICAL_READ_BACK_REQUIRED" };
  }
  return { kind: "ALLOW" };
}

export function decideRadiologyCriticalCommunication(input: { reportStatus: string; isCritical: boolean }): WorkflowDecision {
  if (input.reportStatus !== "APPROVED") return { kind: "REJECT", code: "RADIOLOGY_REPORT_NOT_APPROVED" };
  if (!input.isCritical) return { kind: "REJECT", code: "RADIOLOGY_REPORT_NOT_CRITICAL" };
  return { kind: "ALLOW" };
}

export function decideRadiologyCriticalAcknowledgement(input: {
  status: string;
  readBackRequired: boolean;
  readBackConfirmed: boolean;
  isOrderingDoctor: boolean;
}): WorkflowDecision {
  if (!input.isOrderingDoctor) return { kind: "REJECT", code: "RADIOLOGY_CRITICAL_DOCTOR_REQUIRED" };
  if (input.status !== "NOTIFIED" && input.status !== "ESCALATED") return { kind: "REJECT", code: "RADIOLOGY_CRITICAL_COMMUNICATION_NOT_ACKNOWLEDGEABLE" };
  if (input.readBackRequired && !input.readBackConfirmed) return { kind: "REJECT", code: "RADIOLOGY_CRITICAL_READ_BACK_REQUIRED" };
  return { kind: "ALLOW" };
}

export function decideRadiologyCriticalEscalation(input: { status: string; hasReason: boolean }): WorkflowDecision {
  if (input.status !== "NOTIFIED") return { kind: "REJECT", code: "RADIOLOGY_CRITICAL_COMMUNICATION_NOT_ESCALATABLE" };
  if (!input.hasReason) return { kind: "REJECT", code: "RADIOLOGY_CRITICAL_ESCALATION_REASON_REQUIRED" };
  return { kind: "ALLOW" };
}

export function decideDoctorRadiologyClinicalReview(input: { reportStatus: string; isOrderingDoctor: boolean }): WorkflowDecision {
  if (!input.isOrderingDoctor) return { kind: "REJECT", code: "RADIOLOGY_CLINICAL_REVIEW_DOCTOR_REQUIRED" };
  if (input.reportStatus !== "RELEASED") return { kind: "REJECT", code: "RADIOLOGY_REPORT_NOT_RELEASED" };
  return { kind: "ALLOW" };
}

export function decideExternalRadiologyTransition(input: { status: string; action: "RECEIVE_RESULT" | "REVIEW_RESULT" }): WorkflowDecision {
  if (input.action === "RECEIVE_RESULT" && input.status !== "REFERRED") return { kind: "REJECT", code: "EXTERNAL_RADIOLOGY_NOT_AWAITING_RESULT" };
  if (input.action === "REVIEW_RESULT" && input.status !== "RESULT_RECEIVED") return { kind: "REJECT", code: "EXTERNAL_RADIOLOGY_RESULT_NOT_REVIEWABLE" };
  return { kind: "ALLOW" };
}
