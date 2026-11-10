import { z } from "zod";

import {
  getPatientPhoneMatchKey,
  isValidCalendarDate,
  normalizePatientName,
} from "./validation";

/** Only identifiers represented by the current Patient model can be compared. */
export const patientIdentityIdentifierTypeSchema = z.enum([
  "FULL_NAME",
  "DATE_OF_BIRTH",
  "PHONE",
  "MRN",
]);

const identityIdentifierSchema = z
  .object({
    type: patientIdentityIdentifierTypeSchema,
    value: z.string().trim().min(1).max(254),
  })
  .strict();

export const patientIdentityVerificationSchema = z
  .object({
    firstIdentifier: identityIdentifierSchema,
    secondIdentifier: identityIdentifierSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.firstIdentifier.type === value.secondIdentifier.type) {
      context.addIssue({
        code: "custom",
        path: ["secondIdentifier", "type"],
        message: "Choose two different identity elements.",
      });
    }

    for (const [key, identifier] of [
      ["firstIdentifier", value.firstIdentifier],
      ["secondIdentifier", value.secondIdentifier],
    ] as const) {
      if (
        identifier.type === "DATE_OF_BIRTH" &&
        !isValidCalendarDate(identifier.value)
      ) {
        context.addIssue({
          code: "custom",
          path: [key, "value"],
          message: "Enter a valid date of birth in YYYY-MM-DD format.",
        });
      }

      if (
        identifier.type === "PHONE" &&
        (getPatientPhoneMatchKey(identifier.value).length < 7 ||
          getPatientPhoneMatchKey(identifier.value).length > 15)
      ) {
        context.addIssue({
          code: "custom",
          path: [key, "value"],
          message: "Enter a valid phone number.",
        });
      }

      if (identifier.type === "MRN" && identifier.value.length > 30) {
        context.addIssue({
          code: "custom",
          path: [key, "value"],
          message: "The medical record number is invalid.",
        });
      }
    }
  });

export type PatientIdentityIdentifierType = z.infer<
  typeof patientIdentityIdentifierTypeSchema
>;
export type PatientIdentityIdentifier = z.infer<typeof identityIdentifierSchema>;
export type PatientIdentityVerificationInput = z.infer<
  typeof patientIdentityVerificationSchema
>;

export interface PatientIdentityVerificationRecord {
  mrn: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date | null;
  contacts: Array<{ normalizedValue: string }>;
}

/** Compare a submitted identifier against data already stored on Patient. */
export function matchesPatientIdentityIdentifier(
  patient: PatientIdentityVerificationRecord,
  identifier: PatientIdentityIdentifier,
): boolean {
  switch (identifier.type) {
    case "FULL_NAME": {
      const storedName = [patient.firstName, patient.middleName, patient.lastName]
        .filter(Boolean)
        .join(" ");
      return normalizePatientName(storedName) === normalizePatientName(identifier.value);
    }
    case "DATE_OF_BIRTH":
      return Boolean(
        patient.dateOfBirth &&
          isValidCalendarDate(identifier.value) &&
          patient.dateOfBirth.toISOString().slice(0, 10) === identifier.value,
      );
    case "PHONE": {
      const candidate = getPatientPhoneMatchKey(identifier.value);
      return patient.contacts.some(
        (contact) => getPatientPhoneMatchKey(contact.normalizedValue) === candidate,
      );
    }
    case "MRN":
      return patient.mrn.normalize("NFKC").trim().toLocaleUpperCase("en-US") ===
        identifier.value.normalize("NFKC").trim().toLocaleUpperCase("en-US");
  }
}

/** Two distinct submitted identifiers must both match the same patient record. */
export function verifyPatientIdentityMatch(
  patient: PatientIdentityVerificationRecord,
  input: PatientIdentityVerificationInput,
): boolean {
  return (
    matchesPatientIdentityIdentifier(patient, input.firstIdentifier) &&
    matchesPatientIdentityIdentifier(patient, input.secondIdentifier)
  );
}
