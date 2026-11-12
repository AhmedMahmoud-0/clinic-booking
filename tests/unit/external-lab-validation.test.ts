import { describe, expect, it } from "vitest";
import {
  externalLabCancelRequestSchema,
  externalLabIntakeUnionSchema,
  externalLabReferralRequestSchema,
  externalLabResultRequestSchema,
  externalLabReviewRequestSchema,
  patientRecordConversionRequestSchema,
} from "../../src/server/laboratory/external-lab-validation";

const identity = {
  firstIdentifier: { type: "FULL_NAME", value: "Mona Hassan" },
  secondIdentifier: { type: "MRN", value: "MRN-00821" },
};
const intakeFields = {
  requestSource: "PAPER",
  referringProviderName: "Dr Demo",
  referringFacilityName: "Outside Clinic",
  priority: "ROUTINE",
  labTestIds: ["test-1", "test-2"],
};

describe("external lab intake validation", () => {
  it("accepts a new diagnostic-only patient intake", () => {
    expect(externalLabIntakeUnionSchema.safeParse({
      patientMode: "NEW", patient: { firstName: "Mona", lastName: "Hassan", dateOfBirth: "1990-02-10" }, ...intakeFields,
    }).success).toBe(true);
  });
  it("accepts an existing patient only with two identity elements", () => {
    expect(externalLabIntakeUnionSchema.safeParse({ patientMode: "EXISTING", existingPatientId: "patient-1", identityVerification: identity, ...intakeFields }).success).toBe(true);
  });
  it("rejects an existing-patient intake without identity verification", () => {
    expect(externalLabIntakeUnionSchema.safeParse({ patientMode: "EXISTING", existingPatientId: "patient-1", ...intakeFields }).success).toBe(false);
  });
  it("rejects duplicate test identifiers", () => {
    expect(externalLabIntakeUnionSchema.safeParse({ patientMode: "NEW", patient: { firstName: "Mona", lastName: "Hassan" }, ...intakeFields, labTestIds: ["test-1", "test-1"] }).success).toBe(false);
  });
  it("rejects unsupported client-selected patient, order, or actor fields", () => {
    expect(externalLabIntakeUnionSchema.safeParse({ patientMode: "NEW", patient: { firstName: "Mona", lastName: "Hassan" }, ...intakeFields, patientId: "forged", encounterId: "forged", createdByEmployeeId: "forged" }).success).toBe(false);
  });
  it("rejects impossible dates of birth", () => {
    expect(externalLabIntakeUnionSchema.safeParse({ patientMode: "NEW", patient: { firstName: "Mona", lastName: "Hassan", dateOfBirth: "1990-02-30" }, ...intakeFields }).success).toBe(false);
  });
});

describe("external lab referral and result validation", () => {
  it("requires a complete scoped consent record for a Doctor referral", () => {
    expect(externalLabReferralRequestSchema.safeParse({
      testName: "CBC", reason: "Clinical correlation", externalFacilityName: "Outside Lab",
      consent: { signerPatientId: "patient-1", signerType: "PATIENT", signerNameSnapshot: "Mona Hassan", captureMethod: "WRITTEN", documentVersion: "v1" },
    }).success).toBe(true);
  });
  it("rejects caller-selected referral status and encounter identifiers", () => {
    expect(externalLabReferralRequestSchema.safeParse({ testName: "CBC", reason: "Reason", externalFacilityName: "Lab", status: "REVIEWED", encounterId: "forged", consent: {} }).success).toBe(false);
  });
  it("accepts a bounded external result summary", () => {
    expect(externalLabResultRequestSchema.safeParse({ resultSummary: "CBC summary received from external provider." }).success).toBe(true);
  });
  it("requires non-empty review notes", () => {
    expect(externalLabReviewRequestSchema.safeParse({ reviewNotes: "Reviewed with the reported clinical context." }).success).toBe(true);
    expect(externalLabReviewRequestSchema.safeParse({ reviewNotes: " " }).success).toBe(false);
  });
  it("requires a reason to cancel a referral", () => {
    expect(externalLabCancelRequestSchema.safeParse({ reason: "Duplicate referral" }).success).toBe(true);
    expect(externalLabCancelRequestSchema.safeParse({ reason: " " }).success).toBe(false);
  });
  it("requires Reception reason and identity evidence to convert a diagnostic record", () => {
    expect(patientRecordConversionRequestSchema.safeParse({ reason: "Identity rechecked at reception", identityVerification: identity }).success).toBe(true);
    expect(patientRecordConversionRequestSchema.safeParse({ reason: "short", identityVerification: identity }).success).toBe(false);
  });
});
