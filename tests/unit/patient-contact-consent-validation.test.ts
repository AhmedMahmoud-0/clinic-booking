import { describe, expect, it } from "vitest";
import { patientConsentRecordSchema, patientContactProfileCommandSchema } from "../../src/server/patient-management/patient-contact-consent-validation";

describe("patient contact profile command validation", () => {
  it("accepts a local Egyptian phone contact", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_CONTACT", type: "PHONE", value: "01012345678" }).success).toBe(true));
  it("accepts an international phone contact", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_CONTACT", type: "PHONE", value: "+20 10 1234 5678" }).success).toBe(true));
  it("accepts and lowercases email contact values", () => {
    const parsed = patientContactProfileCommandSchema.parse({
      action: "ADD_CONTACT",
      type: "EMAIL",
      value: "PATIENT@EXAMPLE.COM",
    });

    expect(parsed).toMatchObject({
      action: "ADD_CONTACT",
      type: "EMAIL",
      value: "patient@example.com",
    });
  });
  it("rejects malformed email contacts", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_CONTACT", type: "EMAIL", value: "not-an-email" }).success).toBe(false));
  it("rejects phone numbers that are too short", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_CONTACT", type: "PHONE", value: "123" }).success).toBe(false));
  it("rejects unsupported contact types", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_CONTACT", type: "FAX", value: "12345678" }).success).toBe(false));
  it("rejects unstructured free-text audit reasons", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_CONTACT", type: "PHONE", value: "01012345678", reason: "extra personal details" }).success).toBe(false));
  it("rejects caller-supplied verification timestamps", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_CONTACT", type: "PHONE", value: "01012345678", verifiedAt: "2026-01-01" }).success).toBe(false));
  it("accepts contact primary selection", () => expect(patientContactProfileCommandSchema.safeParse({ action: "SET_PRIMARY_CONTACT", contactId: "contact_1" }).success).toBe(true));
  it("accepts contact deactivation", () => expect(patientContactProfileCommandSchema.safeParse({ action: "DEACTIVATE_CONTACT", contactId: "contact_1" }).success).toBe(true));
  it("accepts a complete Egyptian home address", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_ADDRESS", addressLine1: "12 Demo Street", city: "Cairo", governorate: "Cairo", countryCode: "EG" }).success).toBe(true));
  it("defaults address type to HOME and country to EG", () => { const parsed = patientContactProfileCommandSchema.parse({ action: "ADD_ADDRESS", addressLine1: "12 Demo Street", city: "Cairo", governorate: "Cairo" }); expect(parsed).toMatchObject({ type: "HOME", countryCode: "EG" }); });
  it("rejects empty address line 1", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_ADDRESS", addressLine1: " ", city: "Cairo", governorate: "Cairo" }).success).toBe(false));
  it("rejects invalid country codes", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_ADDRESS", addressLine1: "12 Demo Street", city: "Cairo", governorate: "Cairo", countryCode: "EGY" }).success).toBe(false));
  it("accepts a complete emergency contact", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_EMERGENCY_CONTACT", fullName: "Mona Ali", relationshipType: "SPOUSE", phone: "01012345678" }).success).toBe(true));
  it("rejects an invalid emergency phone number", () => expect(patientContactProfileCommandSchema.safeParse({ action: "ADD_EMERGENCY_CONTACT", fullName: "Mona Ali", relationshipType: "SPOUSE", phone: "12" }).success).toBe(false));
  it("accepts emergency contact deactivation", () => expect(patientContactProfileCommandSchema.safeParse({ action: "DEACTIVATE_EMERGENCY_CONTACT", emergencyContactId: "emergency_1" }).success).toBe(true));
  it("rejects unexpected contact-profile fields", () => expect(patientContactProfileCommandSchema.safeParse({ action: "DEACTIVATE_CONTACT", contactId: "contact_1", patientId: "forged" }).success).toBe(false));
});

describe("patient consent event validation", () => {
  const valid = { consentType: "PERSONAL_DATA_PROCESSING", decision: "GRANTED", captureMethod: "WRITTEN", documentVersion: "2026.01", signerPatientId: "patient_1" };
  it("accepts a granted written consent event", () => expect(patientConsentRecordSchema.safeParse(valid).success).toBe(true));
  it("accepts refusal as a recorded decision", () => expect(patientConsentRecordSchema.safeParse({ ...valid, decision: "REFUSED" }).success).toBe(true));
  it("accepts withdrawal as a new event", () => expect(patientConsentRecordSchema.safeParse({ ...valid, decision: "WITHDRAWN" }).success).toBe(true));
  it("accepts verbal capture", () => expect(patientConsentRecordSchema.safeParse({ ...valid, captureMethod: "VERBAL" }).success).toBe(true));
  it("rejects unsupported consent categories", () => expect(patientConsentRecordSchema.safeParse({ ...valid, consentType: "MARKETING" }).success).toBe(false));
  it("rejects portal capture before the patient portal consent flow exists", () => expect(patientConsentRecordSchema.safeParse({ ...valid, captureMethod: "PATIENT_PORTAL" }).success).toBe(false));
  it("rejects malformed document versions", () => expect(patientConsentRecordSchema.safeParse({ ...valid, documentVersion: "version with spaces" }).success).toBe(false));
  it("requires an explicit signer patient id", () => expect(patientConsentRecordSchema.safeParse({ ...valid, signerPatientId: "" }).success).toBe(false));
  it("rejects client-supplied employee identity", () => expect(patientConsentRecordSchema.safeParse({ ...valid, recordedByEmployeeId: "forged" }).success).toBe(false));
  it("rejects client-supplied signature snapshot", () => expect(patientConsentRecordSchema.safeParse({ ...valid, signerNameSnapshot: "Forged Name" }).success).toBe(false));
});
