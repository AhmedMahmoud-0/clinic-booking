import { describe, expect, it } from "vitest";
import { calculatePatientAgeAtDateOfBirth, canRecordPatientConsentDecision, resolvePatientConsentSignerType } from "../../src/server/patient-management/patient-consent-policy";

describe("patient consent signer policy", () => {
  it("calculates age before the birthday", () => expect(calculatePatientAgeAtDateOfBirth(new Date("2008-11-09T00:00:00.000Z"), "2026-11-08")).toBe(17));
  it("calculates age on the birthday", () => expect(calculatePatientAgeAtDateOfBirth(new Date("2008-11-08T00:00:00.000Z"), "2026-11-08")).toBe(18));
  it("returns null when date of birth is unknown", () => expect(calculatePatientAgeAtDateOfBirth(null, "2026-11-08")).toBeNull());
  it("allows an adult patient to sign their own consent", () => expect(resolvePatientConsentSignerType({ subjectPatientId: "p1", signerPatientId: "p1", age: 30, hasVerifiedLegalGuardianRelationship: false })).toBe("PATIENT"));
  it("does not allow another patient to sign for an adult", () => expect(resolvePatientConsentSignerType({ subjectPatientId: "p1", signerPatientId: "p2", age: 30, hasVerifiedLegalGuardianRelationship: true })).toBeNull());
  it("allows only a verified legal guardian to sign for a minor", () => expect(resolvePatientConsentSignerType({ subjectPatientId: "p1", signerPatientId: "p2", age: 12, hasVerifiedLegalGuardianRelationship: true })).toBe("LEGAL_GUARDIAN"));
  it("rejects an unverified guardian for a minor", () => expect(resolvePatientConsentSignerType({ subjectPatientId: "p1", signerPatientId: "p2", age: 12, hasVerifiedLegalGuardianRelationship: false })).toBeNull());
  it("does not treat a minor as their own authorized signer", () => expect(resolvePatientConsentSignerType({ subjectPatientId: "p1", signerPatientId: "p1", age: 12, hasVerifiedLegalGuardianRelationship: true })).toBeNull());
});

describe("consent decision history policy", () => {
  it("allows initial grant", () => expect(canRecordPatientConsentDecision(null, "GRANTED")).toBe(true));
  it("allows refusal as a history event", () => expect(canRecordPatientConsentDecision(null, "REFUSED")).toBe(true));
  it("allows withdrawal only after the latest grant", () => expect(canRecordPatientConsentDecision("GRANTED", "WITHDRAWN")).toBe(true));
  it("rejects withdrawal after refusal", () => expect(canRecordPatientConsentDecision("REFUSED", "WITHDRAWN")).toBe(false));
  it("rejects repeated withdrawal", () => expect(canRecordPatientConsentDecision("WITHDRAWN", "WITHDRAWN")).toBe(false));
  it("allows a new grant after refusal", () => expect(canRecordPatientConsentDecision("REFUSED", "GRANTED")).toBe(true));
});
