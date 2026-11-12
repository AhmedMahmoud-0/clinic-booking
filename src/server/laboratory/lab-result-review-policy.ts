export type LabResultReviewDecision =
  | { kind: "ALLOW" }
  | { kind: "REJECT"; code: string };

export function decideLabResultSubmission(input: {
  itemStatus: string;
  resultStatus: string;
  authorEmployeeId: string;
  actorEmployeeId: string;
  hasResultContent: boolean;
}): LabResultReviewDecision {
  if (input.itemStatus !== "PROCESSING") return { kind: "REJECT", code: "LAB_ORDER_ITEM_NOT_PROCESSING" };
  if (input.resultStatus !== "DRAFT") return { kind: "REJECT", code: "LAB_RESULT_NOT_DRAFT" };
  if (input.authorEmployeeId !== input.actorEmployeeId) return { kind: "REJECT", code: "LAB_RESULT_AUTHOR_MISMATCH" };
  if (!input.hasResultContent) return { kind: "REJECT", code: "LAB_RESULT_CONTENT_REQUIRED" };
  return { kind: "ALLOW" };
}

export function decideLabResultReview(input: {
  resultStatus: string;
  authorEmployeeId: string;
  reviewerEmployeeId: string;
  decision: "APPROVED" | "REJECTED";
}): LabResultReviewDecision {
  if (input.resultStatus !== "PENDING_REVIEW") return { kind: "REJECT", code: "LAB_RESULT_NOT_PENDING_REVIEW" };
  if (input.authorEmployeeId === input.reviewerEmployeeId) return { kind: "REJECT", code: "LAB_RESULT_SELF_REVIEW_FORBIDDEN" };
  return { kind: "ALLOW" };
}

export function decideLabResultRelease(input: {
  resultStatus: string;
  hasCriticalValues: boolean;
  hasAcknowledgedReadBack: boolean;
}): LabResultReviewDecision {
  if (input.resultStatus !== "APPROVED") return { kind: "REJECT", code: "LAB_RESULT_NOT_APPROVED" };
  if (input.hasCriticalValues && !input.hasAcknowledgedReadBack) {
    return { kind: "REJECT", code: "LAB_CRITICAL_COMMUNICATION_NOT_ACKNOWLEDGED" };
  }
  return { kind: "ALLOW" };
}

export function decideCriticalCommunicationRecord(input: {
  resultStatus: string;
  hasCriticalValues: boolean;
}): LabResultReviewDecision {
  if (input.resultStatus !== "APPROVED") return { kind: "REJECT", code: "LAB_RESULT_NOT_APPROVED" };
  if (!input.hasCriticalValues) return { kind: "REJECT", code: "LAB_RESULT_NOT_CRITICAL" };
  return { kind: "ALLOW" };
}

export function decideCriticalCommunicationAcknowledgement(input: {
  status: string;
  readBackRequired: boolean;
  readBackConfirmed: boolean;
  isOrderingDoctor: boolean;
}): LabResultReviewDecision {
  if (!input.isOrderingDoctor) return { kind: "REJECT", code: "LAB_CRITICAL_DOCTOR_REQUIRED" };
  if (input.status !== "NOTIFIED" && input.status !== "ESCALATED") return { kind: "REJECT", code: "LAB_CRITICAL_COMMUNICATION_NOT_ACKNOWLEDGEABLE" };
  if (input.readBackRequired && !input.readBackConfirmed) return { kind: "REJECT", code: "LAB_CRITICAL_READ_BACK_REQUIRED" };
  return { kind: "ALLOW" };
}

export function decideCriticalCommunicationEscalation(input: {
  status: string;
  hasReason: boolean;
}): LabResultReviewDecision {
  if (input.status !== "NOTIFIED") return { kind: "REJECT", code: "LAB_CRITICAL_COMMUNICATION_NOT_ESCALATABLE" };
  if (!input.hasReason) return { kind: "REJECT", code: "LAB_CRITICAL_ESCALATION_REASON_REQUIRED" };
  return { kind: "ALLOW" };
}

export function decideDoctorLabClinicalReview(input: {
  resultStatus: string;
  isOrderingDoctor: boolean;
}): LabResultReviewDecision {
  if (!input.isOrderingDoctor) return { kind: "REJECT", code: "LAB_CLINICAL_REVIEW_DOCTOR_REQUIRED" };
  if (input.resultStatus !== "RELEASED") return { kind: "REJECT", code: "LAB_RESULT_NOT_RELEASED" };
  return { kind: "ALLOW" };
}
