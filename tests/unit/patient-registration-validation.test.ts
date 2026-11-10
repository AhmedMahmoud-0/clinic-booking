import { describe, expect, it } from "vitest";

import {
  createPatientSchema,
  getPatientIdentityMatches,
  getPatientPhoneLookupValues,
  normalizePatientPhone,
  patientDuplicateCheckSchema,
  toPatientDuplicateCandidate,
  type PatientDuplicateComparable,
  type PatientDuplicateCheckInput,
} from "../../src/server/patient-management/validation";

const validDemographics = {
  firstName: "Mariam",
  middleName: "Ali",
  lastName: "Hassan",
  dateOfBirth: "1995-04-12",
  phone: "+20 10 1234 5678",
};

const validRegistration = {
  ...validDemographics,
  gender: "FEMALE" as const,
  email: "MARIAM@example.com",
  identityElements: ["FULL_NAME", "DATE_OF_BIRTH"] as const,
};

const comparablePatient: PatientDuplicateComparable = {
  id: "patient-existing",
  mrn: "MRN-2026-ABCDEF123456",
  isActive: true,
  firstName: "Mariam",
  middleName: "Ali",
  lastName: "Hassan",
  dateOfBirth: new Date("1995-04-12T00:00:00.000Z"),
  contacts: [{ normalizedValue: "201012345678" }],
};

const duplicateInput: PatientDuplicateCheckInput = {
  firstName: "Mariam",
  middleName: "Ali",
  lastName: "Hassan",
  dateOfBirth: "1995-04-12",
  phone: "01012345678",
};

describe("patient registration validation", () => {
  it("accepts a valid patient registration with two checked identity elements", () => {
    expect(createPatientSchema.safeParse(validRegistration).success).toBe(true);
  });

  it("normalizes an email address to lowercase", () => {
    const parsed = createPatientSchema.safeParse(validRegistration);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("mariam@example.com");
  });

  it("allows an unknown date of birth when another independent element is checked", () => {
    expect(
      createPatientSchema.safeParse({
        ...validRegistration,
        dateOfBirth: null,
        identityElements: ["FULL_NAME", "PHONE"],
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid calendar date", () => {
    expect(createPatientSchema.safeParse({ ...validRegistration, dateOfBirth: "1995-02-30" }).success).toBe(false);
  });

  it("rejects a future date of birth", () => {
    expect(createPatientSchema.safeParse({ ...validRegistration, dateOfBirth: "2999-01-01" }).success).toBe(false);
  });

  it("requires a phone contact", () => {
    expect(
      createPatientSchema.safeParse({
        firstName: "Mariam",
        middleName: "Ali",
        lastName: "Hassan",
        dateOfBirth: "1995-04-12",
        identityElements: ["FULL_NAME", "DATE_OF_BIRTH"],
      }).success,
    ).toBe(false);
  });

  it("rejects a phone value with too few digits", () => {
    expect(createPatientSchema.safeParse({ ...validRegistration, phone: "12345" }).success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    expect(createPatientSchema.safeParse({ ...validRegistration, email: "not-an-email" }).success).toBe(false);
  });

  it("requires exactly two identity elements", () => {
    expect(createPatientSchema.safeParse({ ...validRegistration, identityElements: ["FULL_NAME"] }).success).toBe(false);
    expect(
      createPatientSchema.safeParse({
        ...validRegistration,
        identityElements: ["FULL_NAME", "DATE_OF_BIRTH", "PHONE"],
      }).success,
    ).toBe(false);
  });

  it("rejects selecting the same identity element twice", () => {
    expect(
      createPatientSchema.safeParse({ ...validRegistration, identityElements: ["FULL_NAME", "FULL_NAME"] }).success,
    ).toBe(false);
  });

  it("requires full name to be one of the checked identity elements", () => {
    expect(
      createPatientSchema.safeParse({ ...validRegistration, identityElements: ["DATE_OF_BIRTH", "PHONE"] }).success,
    ).toBe(false);
  });

  it("requires date of birth when it is selected as an identity element", () => {
    expect(
      createPatientSchema.safeParse({
        ...validRegistration,
        dateOfBirth: null,
        identityElements: ["FULL_NAME", "DATE_OF_BIRTH"],
      }).success,
    ).toBe(false);
  });

  it("does not accept a system-generated MRN as an intake identity element", () => {
    expect(
      createPatientSchema.safeParse({ ...validRegistration, identityElements: ["FULL_NAME", "MRN"] }).success,
    ).toBe(false);
  });

  it("allows staff to attest that a national ID was checked without accepting its raw value", () => {
    expect(
      createPatientSchema.safeParse({ ...validRegistration, identityElements: ["FULL_NAME", "NATIONAL_ID"] }).success,
    ).toBe(true);
    expect(
      createPatientSchema.safeParse({ ...validRegistration, nationalId: "12345678901234" }).success,
    ).toBe(false);
  });

  it("defaults duplicate-review acknowledgement to false", () => {
    const parsed = createPatientSchema.safeParse(validRegistration);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.duplicateReviewAcknowledged).toBe(false);
  });

  it("accepts the minimal demographic payload for a duplicate check", () => {
    expect(patientDuplicateCheckSchema.safeParse(validDemographics).success).toBe(true);
  });

  it("rejects unexpected fields in a duplicate-check request", () => {
    expect(patientDuplicateCheckSchema.safeParse({ ...validDemographics, email: "mariam@example.com" }).success).toBe(false);
  });
});

describe("patient duplicate matching", () => {
  it("matches a complete normalized full name", () => {
    expect(getPatientIdentityMatches(duplicateInput, comparablePatient)).toContain("FULL_NAME");
  });

  it("matches the exact date of birth", () => {
    expect(getPatientIdentityMatches(duplicateInput, comparablePatient)).toContain("DATE_OF_BIRTH");
  });

  it("matches a normalized phone number", () => {
    expect(getPatientIdentityMatches(duplicateInput, comparablePatient)).toContain("PHONE");
  });

  it("classifies an exact full-name and date-of-birth match as high confidence", () => {
    const candidate = toPatientDuplicateCandidate(
      { ...duplicateInput, phone: "01199999999" },
      comparablePatient,
    );
    expect(candidate?.confidence).toBe("HIGH");
    expect(candidate?.matchedIdentifiers).toEqual(["FULL_NAME", "DATE_OF_BIRTH"]);
  });

  it("does not block a patient with a matching birth date and shared phone when the full name differs", () => {
    const candidate = toPatientDuplicateCandidate(
      { ...duplicateInput, firstName: "Different", middleName: null, lastName: "Person" },
      comparablePatient,
    );
    expect(candidate?.confidence).toBe("REVIEW");
    expect(candidate?.matchedIdentifiers).toEqual(["DATE_OF_BIRTH", "PHONE"]);
  });

  it("does not treat a shared phone number alone as a high-confidence duplicate", () => {
    const candidate = toPatientDuplicateCandidate(
      { ...duplicateInput, firstName: "Different", middleName: null, lastName: "Person", dateOfBirth: null },
      comparablePatient,
    );
    expect(candidate?.confidence).toBe("REVIEW");
    expect(candidate?.matchedIdentifiers).toEqual(["PHONE"]);
  });

  it("does not classify name plus a shared phone as a high-confidence duplicate without date of birth", () => {
    const candidate = toPatientDuplicateCandidate(
      { ...duplicateInput, dateOfBirth: null },
      comparablePatient,
    );
    expect(candidate?.confidence).toBe("REVIEW");
    expect(candidate?.matchedIdentifiers).toEqual(["FULL_NAME", "PHONE"]);
  });

  it("normalizes Arabic-Indic and Eastern Arabic-Indic phone digits", () => {
    expect(normalizePatientPhone("٠١٠ ١٢٣٤ ٥٦٧٨")).toBe("01012345678");
    expect(normalizePatientPhone("۰۱۰-۱۲۳۴-۵۶۷۸")).toBe("01012345678");
  });

  it("looks up local and +20 variants to remain compatible with existing contacts", () => {
    expect(getPatientPhoneLookupValues("01012345678")).toEqual([
      "01012345678",
      "201012345678",
    ]);
    expect(getPatientPhoneLookupValues("+20 10 1234 5678")).toEqual([
      "201012345678",
      "01012345678",
    ]);
  });

  it("matches a legacy locally stored phone against a country-code input", () => {
    const candidate = toPatientDuplicateCandidate(
      { ...duplicateInput, phone: "+20 10 1234 5678" },
      {
        ...comparablePatient,
        contacts: [{ normalizedValue: "01012345678" }],
      },
    );
    expect(candidate?.matchedIdentifiers).toContain("PHONE");
  });

  it("does not return a candidate when no independent demographic/contact signal matches", () => {
    const candidate = toPatientDuplicateCandidate(
      {
        firstName: "Different",
        middleName: null,
        lastName: "Person",
        dateOfBirth: null,
        phone: "01199999999",
      },
      comparablePatient,
    );
    expect(candidate).toBeNull();
  });
});
