import { describe, expect, it } from "vitest";

import {
  matchesPatientIdentifier,
  normalizeIdentityValue,
  patientAccountLinkSchema,
  type PatientIdentityRecord,
} from "../../src/server/auth/account-linking/validation";

const patient: PatientIdentityRecord = {
  mrn: "MRN-00125",
  firstName: "Ahmed",
  middleName: "Ali",
  lastName: "Mahmoud",
  dateOfBirth: new Date("1990-05-12T00:00:00.000Z"),
  contacts: [
    { type: "PHONE", normalizedValue: "+201001234567" },
  ],
};

describe("patient account-linking validation", () => {
  it("normalizes names without changing their meaning", () => {
    expect(normalizeIdentityValue("  AHMED   Ali Mahmoud ")).toBe(
      "ahmed ali mahmoud",
    );
  });

  it("matches the full name using the patient profile fields", () => {
    expect(
      matchesPatientIdentifier(patient, {
        type: "FULL_NAME",
        value: "Ahmed Ali Mahmoud",
      }),
    ).toBe(true);
  });

  it("matches date of birth as a calendar date", () => {
    expect(
      matchesPatientIdentifier(patient, {
        type: "DATE_OF_BIRTH",
        value: "1990-05-12",
      }),
    ).toBe(true);
    expect(
      matchesPatientIdentifier(patient, {
        type: "DATE_OF_BIRTH",
        value: "1990-02-30",
      }),
    ).toBe(false);
  });

  it("matches MRN without case sensitivity", () => {
    expect(
      matchesPatientIdentifier(patient, {
        type: "MRN",
        value: "mrn-00125",
      }),
    ).toBe(true);
  });

  it("matches formatted phone input against the stored normalized phone", () => {
    expect(
      matchesPatientIdentifier(patient, {
        type: "PHONE",
        value: "+20 100-123-4567",
      }),
    ).toBe(true);
  });

  it("rejects using the same identity element twice", () => {
    const result = patientAccountLinkSchema.safeParse({
      email: "patient@example.com",
      patientId: "patient-id",
      firstIdentifier: { type: "MRN", value: "MRN-00125" },
      secondIdentifier: { type: "MRN", value: "MRN-00125" },
      reason: "Verified at reception.",
    });

    expect(result.success).toBe(false);
  });

  it("does not accept identity types that are not stored on Patient", () => {
    const result = patientAccountLinkSchema.safeParse({
      email: "patient@example.com",
      patientId: "patient-id",
      firstIdentifier: { type: "NATIONAL_ID", value: "12345678901234" },
      secondIdentifier: { type: "DATE_OF_BIRTH", value: "1990-05-12" },
      reason: "Verified at reception.",
    });

    expect(result.success).toBe(false);
  });
});
