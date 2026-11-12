import { describe, expect, it } from "vitest";
import {
  doctorRadiologyClinicalReviewRequestSchema,
  externalRadiologyReferralRequestSchema,
  externalRadiologyResultRequestSchema,
  externalRadiologyReviewRequestSchema,
  radiologyCriticalAcknowledgementRequestSchema,
  radiologyCriticalCommunicationRequestSchema,
  radiologyCriticalEscalationRequestSchema,
  radiologyExamCompletionRequestSchema,
  radiologyReportDraftRequestSchema,
  radiologyReportReviewRequestSchema,
} from "../../src/server/radiology/radiology-phase-8i-j-validation";

const consent = {
  signerPatientId: "patient-1", signerType: "PATIENT", signerNameSnapshot: "Synthetic Patient",
  captureMethod: "WRITTEN", documentVersion: "2026-01",
};

describe("radiology execution and report validation", () => {
  it("accepts an optional exam completion note and rejects forged fields", () => {
    expect(radiologyExamCompletionRequestSchema.safeParse({ notes: "Completed successfully." }).success).toBe(true);
    expect(radiologyExamCompletionRequestSchema.safeParse({ status: "COMPLETED", performedByEmployeeId: "forged" }).success).toBe(false);
  });
  it("requires report findings and impression", () => {
    expect(radiologyReportDraftRequestSchema.safeParse({ findings: "No acute finding.", impression: "No acute abnormality." }).success).toBe(true);
    expect(radiologyReportDraftRequestSchema.safeParse({ findings: "", impression: "" }).success).toBe(false);
  });
  it("requires a reason for critical reports and rejects stray critical reasons", () => {
    expect(radiologyReportDraftRequestSchema.safeParse({ findings: "Finding", impression: "Impression", isCritical: true }).success).toBe(false);
    expect(radiologyReportDraftRequestSchema.safeParse({ findings: "Finding", impression: "Impression", isCritical: true, criticalReason: "Urgent unexpected finding" }).success).toBe(true);
    expect(radiologyReportDraftRequestSchema.safeParse({ findings: "Finding", impression: "Impression", criticalReason: "Not critical" }).success).toBe(false);
  });
  it("requires comments when a Radiologist requests changes", () => {
    expect(radiologyReportReviewRequestSchema.safeParse({ decision: "APPROVED" }).success).toBe(true);
    expect(radiologyReportReviewRequestSchema.safeParse({ decision: "CHANGES_REQUESTED" }).success).toBe(false);
    expect(radiologyReportReviewRequestSchema.safeParse({ decision: "CHANGES_REQUESTED", comments: "Clarify the impression." }).success).toBe(true);
  });
});

describe("radiology critical communication validation", () => {
  it("requires a communication method and recipient", () => {
    expect(radiologyCriticalCommunicationRequestSchema.safeParse({ method: "PHONE", communicatedToName: "Dr Demo" }).success).toBe(true);
    expect(radiologyCriticalCommunicationRequestSchema.safeParse({ method: "PHONE", communicatedToName: "" }).success).toBe(false);
  });
  it("requires explicit read-back confirmation and escalation reason", () => {
    expect(radiologyCriticalAcknowledgementRequestSchema.safeParse({ readBackConfirmed: true }).success).toBe(true);
    expect(radiologyCriticalAcknowledgementRequestSchema.safeParse({ readBackConfirmed: false }).success).toBe(false);
    expect(radiologyCriticalEscalationRequestSchema.safeParse({ reason: "No response from the first contact." }).success).toBe(true);
    expect(radiologyCriticalEscalationRequestSchema.safeParse({ reason: " " }).success).toBe(false);
  });
});

describe("external radiology validation", () => {
  it("requires scoped consent details to create a referral", () => {
    const request = { procedureName: "CT Chest", reason: "Outside imaging requested", externalFacilityName: "External Imaging Center", consent };
    expect(externalRadiologyReferralRequestSchema.safeParse(request).success).toBe(true);
    expect(externalRadiologyReferralRequestSchema.safeParse({ ...request, consent: undefined }).success).toBe(false);
  });
  it("requires an external findings and impression summary", () => {
    expect(externalRadiologyResultRequestSchema.safeParse({ findings: "Finding", impression: "Impression" }).success).toBe(true);
    expect(externalRadiologyResultRequestSchema.safeParse({ findings: "", impression: "Impression" }).success).toBe(false);
    expect(externalRadiologyResultRequestSchema.safeParse({ findings: "Finding", impression: "Impression", performedAt: "not-a-date" }).success).toBe(false);
  });
  it("requires notes when an external result needs follow-up", () => {
    expect(externalRadiologyReviewRequestSchema.safeParse({ decision: "REVIEWED" }).success).toBe(true);
    expect(externalRadiologyReviewRequestSchema.safeParse({ decision: "FOLLOW_UP_REQUIRED" }).success).toBe(false);
    expect(externalRadiologyReviewRequestSchema.safeParse({ decision: "FOLLOW_UP_REQUIRED", notes: "Discuss the outside findings with the patient." }).success).toBe(true);
    expect(doctorRadiologyClinicalReviewRequestSchema.safeParse({ decision: "FOLLOW_UP_REQUIRED" }).success).toBe(false);
  });
});
