import { describe, expect, it } from "vitest";

import {
  matchesPatientIdentityIdentifier,
  patientIdentityVerificationSchema,
  verifyPatientIdentityMatch,
  type PatientIdentityVerificationRecord,
} from "../../src/server/patient-management/identity-verification-validation";

const patient: PatientIdentityVerificationRecord = {
  mrn: "MRN-2026-ABCDEF123456",
  firstName: "Mariam",
  middleName: "Ali",
  lastName: "Hassan",
  dateOfBirth: new Date("1995-04-12T00:00:00.000Z"),
  contacts: [{ normalizedValue: "01012345678" }],
};

const validInput = {
  firstIdentifier: { type: "FULL_NAME", value: "MARIAM  ALI HASSAN" },
  secondIdentifier: { type: "DATE_OF_BIRTH", value: "1995-04-12" },
};

describe("patient identity verification input", () => {
  it("accepts two distinct supported identity elements", () => {
    expect(patientIdentityVerificationSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects using the same identity element twice", () => {
    expect(
      patientIdentityVerificationSchema.safeParse({
        firstIdentifier: { type: "PHONE", value: "01012345678" },
        secondIdentifier: { type: "PHONE", value: "01012345678" },
      }).success,
    ).toBe(false);
  });

  it("rejects national ID because it is not stored on the current Patient model", () => {
    expect(
      patientIdentityVerificationSchema.safeParse({
        firstIdentifier: { type: "FULL_NAME", value: "Mariam Ali Hassan" },
        secondIdentifier: { type: "NATIONAL_ID", value: "12345678901234" },
      }).success,
    ).toBe(false);
  });

  it("rejects passport because it is not stored on the current Patient model", () => {
    expect(
      patientIdentityVerificationSchema.safeParse({
        firstIdentifier: { type: "FULL_NAME", value: "Mariam Ali Hassan" },
        secondIdentifier: { type: "PASSPORT", value: "A1234567" },
      }).success,
    ).toBe(false);
  });

  it("rejects an empty identifier value", () => {
    expect(
      patientIdentityVerificationSchema.safeParse({
        firstIdentifier: { type: "FULL_NAME", value: " " },
        secondIdentifier: { type: "MRN", value: "MRN-2026-ABCDEF123456" },
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid calendar date", () => {
    expect(
      patientIdentityVerificationSchema.safeParse({
        firstIdentifier: { type: "DATE_OF_BIRTH", value: "1995-02-30" },
        secondIdentifier: { type: "MRN", value: "MRN-2026-ABCDEF123456" },
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    expect(
      patientIdentityVerificationSchema.safeParse({
        firstIdentifier: { type: "PHONE", value: "12345" },
        secondIdentifier: { type: "MRN", value: "MRN-2026-ABCDEF123456" },
      }).success,
    ).toBe(false);
  });

  it("rejects unexpected raw identifier fields", () => {
    expect(
      patientIdentityVerificationSchema.safeParse({
        ...validInput,
        nationalId: "12345678901234",
      }).success,
    ).toBe(false);
  });
});

describe("patient identity comparison", () => {
  it("matches full name after Unicode, case, and whitespace normalization", () => {
    expect(
      matchesPatientIdentityIdentifier(patient, {
        type: "FULL_NAME",
        value: "  mariam   ali hassan ",
      }),
    ).toBe(true);
  });

  it("does not match a different full name", () => {
    expect(
      matchesPatientIdentityIdentifier(patient, {
        type: "FULL_NAME",
        value: "Mariam Hassan",
      }),
    ).toBe(false);
  });

  it("matches the exact stored date of birth", () => {
    expect(
      matchesPatientIdentityIdentifier(patient, {
        type: "DATE_OF_BIRTH",
        value: "1995-04-12",
      }),
    ).toBe(true);
  });

  it("does not match a different date of birth", () => {
    expect(
      matchesPatientIdentityIdentifier(patient, {
        type: "DATE_OF_BIRTH",
        value: "1995-04-13",
      }),
    ).toBe(false);
  });

  it("matches Egyptian local and +20 phone formats", () => {
    expect(
      matchesPatientIdentityIdentifier(patient, {
        type: "PHONE",
        value: "+20 10 1234 5678",
      }),
    ).toBe(true);
  });

  it("matches Arabic-Indic digits in a stored phone identifier", () => {
    expect(
      matchesPatientIdentityIdentifier(patient, {
        type: "PHONE",
        value: "٠١٠١٢٣٤٥٦٧٨",
      }),
    ).toBe(true);
  });

  it("matches an MRN case-insensitively", () => {
    expect(
      matchesPatientIdentityIdentifier(patient, {
        type: "MRN",
        value: "mrn-2026-abcdef123456",
      }),
    ).toBe(true);
  });

  it("returns verified only when both distinct identifiers match", () => {
    const parsed = patientIdentityVerificationSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(verifyPatientIdentityMatch(patient, parsed.data)).toBe(true);
  });

  it("returns failed when either identifier does not match", () => {
    const parsed = patientIdentityVerificationSchema.safeParse({
      firstIdentifier: { type: "FULL_NAME", value: "Mariam Ali Hassan" },
      secondIdentifier: { type: "MRN", value: "MRN-2026-WRONG" },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(verifyPatientIdentityMatch(patient, parsed.data)).toBe(false);
  });
});
