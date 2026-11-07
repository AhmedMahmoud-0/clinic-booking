import { z } from "zod";

export const employeeAccountLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  employeeId: z.string().trim().min(1).max(128),
  reason: z.string().trim().min(5).max(500),
});

const supportedIdentityElementSchema = z.enum([
  "FULL_NAME",
  "DATE_OF_BIRTH",
  "PHONE",
  "MRN",
]);

const identityIdentifierSchema = z.object({
  type: supportedIdentityElementSchema,
  value: z.string().trim().min(1).max(254),
});

export const patientAccountLinkSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    patientId: z.string().trim().min(1).max(128),
    firstIdentifier: identityIdentifierSchema,
    secondIdentifier: identityIdentifierSchema,
    reason: z.string().trim().min(5).max(500),
  })
  .superRefine((value, context) => {
    if (value.firstIdentifier.type === value.secondIdentifier.type) {
      context.addIssue({
        code: "custom",
        path: ["secondIdentifier", "type"],
        message: "Choose two different identity elements.",
      });
    }
  });

export type SupportedIdentityElement = z.infer<
  typeof supportedIdentityElementSchema
>;
export type IdentityIdentifier = z.infer<typeof identityIdentifierSchema>;
export type PatientAccountLinkInput = z.infer<
  typeof patientAccountLinkSchema
>;

export function normalizeIdentityValue(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export interface PatientIdentityRecord {
  mrn: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date | null;
  contacts: Array<{ type: "PHONE" | "EMAIL"; normalizedValue: string }>;
}

/**
 * Compare only identifiers represented by the current Patient schema.
 * National ID, passport, email, and OTHER are intentionally not accepted as
 * the two clinic identity elements because they are not independent identity
 * fields on Patient in this version.
 */
export function matchesPatientIdentifier(
  patient: PatientIdentityRecord,
  identifier: IdentityIdentifier,
): boolean {
  switch (identifier.type) {
    case "FULL_NAME": {
      const storedName = [
        patient.firstName,
        patient.middleName,
        patient.lastName,
      ]
        .filter(Boolean)
        .join(" ");
      return normalizeIdentityValue(storedName) === normalizeIdentityValue(identifier.value);
    }
    case "DATE_OF_BIRTH": {
      if (!patient.dateOfBirth || !isValidIsoDate(identifier.value)) return false;
      return patient.dateOfBirth.toISOString().slice(0, 10) === identifier.value;
    }
    case "PHONE": {
      const candidate = normalizePhone(identifier.value);
      if (candidate.length < 7) return false;
      return patient.contacts.some(
        (contact) =>
          contact.type === "PHONE" &&
          normalizePhone(contact.normalizedValue) === candidate,
      );
    }
    case "MRN":
      return normalizeIdentityValue(patient.mrn) === normalizeIdentityValue(identifier.value);
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
