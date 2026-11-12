export type ExternalLabReferralStatus = "REFERRED" | "RESULT_RECEIVED" | "REVIEWED" | "CANCELLED";
export type ExternalLabReferralAction = "RECEIVE_RESULT" | "REVIEW_RESULT" | "CANCEL";

export function decideExternalLabReferralTransition(input: {
  status: ExternalLabReferralStatus;
  action: ExternalLabReferralAction;
}): { kind: "ALLOW" } | { kind: "REJECT"; code: "EXTERNAL_LAB_RESULT_NOT_RECEIVABLE" | "EXTERNAL_LAB_RESULT_NOT_REVIEWABLE" | "EXTERNAL_LAB_REFERRAL_NOT_CANCELLABLE" } {
  if (input.action === "RECEIVE_RESULT") return input.status === "REFERRED" ? { kind: "ALLOW" } : { kind: "REJECT", code: "EXTERNAL_LAB_RESULT_NOT_RECEIVABLE" };
  if (input.action === "REVIEW_RESULT") return input.status === "RESULT_RECEIVED" ? { kind: "ALLOW" } : { kind: "REJECT", code: "EXTERNAL_LAB_RESULT_NOT_REVIEWABLE" };
  return input.status === "REFERRED" ? { kind: "ALLOW" } : { kind: "REJECT", code: "EXTERNAL_LAB_REFERRAL_NOT_CANCELLABLE" };
}

export function decideDiagnosticPatientConversion(input: {
  recordType: string;
  identityVerified: boolean;
}): { kind: "ALLOW" } | { kind: "REJECT"; code: "PATIENT_RECORD_NOT_DIAGNOSTIC_ONLY" | "PATIENT_IDENTITY_NOT_VERIFIED" } {
  if (input.recordType !== "DIAGNOSTIC_ONLY") return { kind: "REJECT", code: "PATIENT_RECORD_NOT_DIAGNOSTIC_ONLY" };
  return input.identityVerified ? { kind: "ALLOW" } : { kind: "REJECT", code: "PATIENT_IDENTITY_NOT_VERIFIED" };
}
