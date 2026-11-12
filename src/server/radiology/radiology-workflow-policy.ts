export type RadiologyModality = "DIGITAL_XRAY" | "ULTRASOUND";
export type RadiologyPregnancyResult = "NOT_APPLICABLE" | "NEGATIVE" | "POSITIVE" | "DECLINED";
export type RadiologyPregnancyDecision = "AUTHORIZE_AFTER_REVIEW" | "DEFER_EXAM" | null;

export function decideRadiologyScheduling(input: {
  itemStatus: string;
  orderStatus: string;
  resourceActive: boolean;
  resourceModality: string;
  procedureModality: RadiologyModality;
  durationMinutes: number | null;
  startsInFuture: boolean;
  workflowStarted: boolean;
  preOrderPregnancyAssessment: string | null;
}): { kind: "ALLOW" } | { kind: "REJECT"; code: string } {
  if (!["PENDING", "SCHEDULED"].includes(input.itemStatus) || !["ORDERED", "SCHEDULED"].includes(input.orderStatus)) return { kind: "REJECT", code: "RADIOLOGY_ORDER_NOT_SCHEDULABLE" };
  if (input.workflowStarted) return { kind: "REJECT", code: "RADIOLOGY_RESCHEDULE_LOCKED" };
  if (!input.resourceActive) return { kind: "REJECT", code: "RADIOLOGY_RESOURCE_NOT_AVAILABLE" };
  if (input.resourceModality !== input.procedureModality) return { kind: "REJECT", code: "RADIOLOGY_RESOURCE_MODALITY_MISMATCH" };
  if (!input.durationMinutes || input.durationMinutes < 5 || input.durationMinutes > 240) return { kind: "REJECT", code: "RADIOLOGY_DURATION_NOT_CONFIGURED" };
  if (!input.startsInFuture) return { kind: "REJECT", code: "RADIOLOGY_SCHEDULE_MUST_BE_FUTURE" };
  if (input.procedureModality === "DIGITAL_XRAY" && input.preOrderPregnancyAssessment === null) return { kind: "REJECT", code: "RADIOLOGY_PRE_ORDER_PREGNANCY_ASSESSMENT_REQUIRED" };
  return { kind: "ALLOW" };
}

export function decideRadiologyReadiness(input: {
  examStatus: string;
  itemStatus: string;
  identityVerified: boolean;
  preparationStatus: string;
  modality: RadiologyModality;
  pregnancyResult: RadiologyPregnancyResult | null;
  radiologistDecision: RadiologyPregnancyDecision;
}): { identityVerified: boolean; preparationComplete: boolean; pregnancyScreeningRequired: boolean; pregnancyScreeningComplete: boolean; canStart: boolean; deferred: boolean } {
  const preparationComplete = input.preparationStatus === "CONFIRMED" || input.preparationStatus === "NOT_REQUIRED";
  const pregnancyScreeningRequired = input.modality === "DIGITAL_XRAY";
  const pregnancyScreeningComplete = !pregnancyScreeningRequired || Boolean(input.pregnancyResult && (
    input.pregnancyResult === "NEGATIVE" || input.pregnancyResult === "NOT_APPLICABLE" || input.radiologistDecision === "AUTHORIZE_AFTER_REVIEW"
  ));
  const deferred = input.radiologistDecision === "DEFER_EXAM" || input.examStatus === "CANCELLED";
  return {
    identityVerified: input.identityVerified,
    preparationComplete,
    pregnancyScreeningRequired,
    pregnancyScreeningComplete,
    deferred,
    canStart: !deferred && input.examStatus === "SCHEDULED" && input.itemStatus === "SCHEDULED" && input.identityVerified && preparationComplete && pregnancyScreeningComplete,
  };
}

export function requiresRadiologistPregnancyReview(result: RadiologyPregnancyResult): boolean {
  return result === "POSITIVE" || result === "DECLINED";
}
