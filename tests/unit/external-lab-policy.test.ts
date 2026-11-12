import { describe, expect, it } from "vitest";
import { decideDiagnosticPatientConversion, decideExternalLabReferralTransition } from "../../src/server/laboratory/external-lab-policy";

describe("external laboratory referral lifecycle", () => {
  it("allows receiving a result only while referred", () => {
    expect(decideExternalLabReferralTransition({ status: "REFERRED", action: "RECEIVE_RESULT" })).toEqual({ kind: "ALLOW" });
  });
  it("rejects repeated result receipt", () => {
    expect(decideExternalLabReferralTransition({ status: "RESULT_RECEIVED", action: "RECEIVE_RESULT" })).toEqual({ kind: "REJECT", code: "EXTERNAL_LAB_RESULT_NOT_RECEIVABLE" });
  });
  it("allows Doctor review only after a result is received", () => {
    expect(decideExternalLabReferralTransition({ status: "RESULT_RECEIVED", action: "REVIEW_RESULT" })).toEqual({ kind: "ALLOW" });
  });
  it("rejects review before result receipt", () => {
    expect(decideExternalLabReferralTransition({ status: "REFERRED", action: "REVIEW_RESULT" })).toEqual({ kind: "REJECT", code: "EXTERNAL_LAB_RESULT_NOT_REVIEWABLE" });
  });
  it("allows cancellation only before a result is received", () => {
    expect(decideExternalLabReferralTransition({ status: "REFERRED", action: "CANCEL" })).toEqual({ kind: "ALLOW" });
  });
  it("rejects cancellation after result receipt", () => {
    expect(decideExternalLabReferralTransition({ status: "RESULT_RECEIVED", action: "CANCEL" })).toEqual({ kind: "REJECT", code: "EXTERNAL_LAB_REFERRAL_NOT_CANCELLABLE" });
  });
  it("rejects transitions after review", () => {
    expect(decideExternalLabReferralTransition({ status: "REVIEWED", action: "RECEIVE_RESULT" }).kind).toBe("REJECT");
  });
  it("rejects transitions after cancellation", () => {
    expect(decideExternalLabReferralTransition({ status: "CANCELLED", action: "REVIEW_RESULT" }).kind).toBe("REJECT");
  });
});

describe("diagnostic-only patient conversion", () => {
  it("allows conversion only after identity verification", () => {
    expect(decideDiagnosticPatientConversion({ recordType: "DIAGNOSTIC_ONLY", identityVerified: true })).toEqual({ kind: "ALLOW" });
  });
  it("rejects conversion when identity verification fails", () => {
    expect(decideDiagnosticPatientConversion({ recordType: "DIAGNOSTIC_ONLY", identityVerified: false })).toEqual({ kind: "REJECT", code: "PATIENT_IDENTITY_NOT_VERIFIED" });
  });
  it("does not reconvert a full patient record", () => {
    expect(decideDiagnosticPatientConversion({ recordType: "FULL", identityVerified: true })).toEqual({ kind: "REJECT", code: "PATIENT_RECORD_NOT_DIAGNOSTIC_ONLY" });
  });
});
