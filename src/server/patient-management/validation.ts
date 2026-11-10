import { z } from "zod";

const nameField = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Names cannot contain control characters.");

const dateOfBirthField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for the date of birth.")
  .refine(isValidCalendarDate, "Enter a valid calendar date.")
  .nullable()
  .optional();

const phoneField = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .refine((value) => {
    const digits = normalizePatientPhone(value);
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a phone number containing 7 to 15 digits.");

const identityElementField = z.enum([
  "FULL_NAME",
  "DATE_OF_BIRTH",
  "PHONE",
  "NATIONAL_ID",
  "PASSPORT",
  "OTHER",
]);

const patientDemographicsShape = {
  firstName: nameField,
  middleName: nameField.nullable().optional(),
  lastName: nameField,
  dateOfBirth: dateOfBirthField,
  phone: phoneField,
};

function isFutureDateOfBirth(value: string): boolean {
  return value > getCairoDateString(new Date());
}

export const patientDuplicateCheckSchema = z
  .object(patientDemographicsShape)
  .strict()
  .superRefine((value, context) => {
    if (value.dateOfBirth && isFutureDateOfBirth(value.dateOfBirth)) {
      context.addIssue({
        code: "custom",
        path: ["dateOfBirth"],
        message: "Date of birth cannot be in the future.",
      });
    }
  });

export const createPatientSchema = z
  .object({
    ...patientDemographicsShape,
    preferredName: nameField.nullable().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "NOT_SPECIFIED"]).nullable().optional(),
    email: z.string().trim().toLowerCase().email().max(254).nullable().optional(),
    identityElements: z.tuple([identityElementField, identityElementField]),
    duplicateReviewAcknowledged: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.dateOfBirth && isFutureDateOfBirth(value.dateOfBirth)) {
      context.addIssue({
        code: "custom",
        path: ["dateOfBirth"],
        message: "Date of birth cannot be in the future.",
      });
    }

    if (new Set(value.identityElements).size !== 2) {
      context.addIssue({
        code: "custom",
        path: ["identityElements"],
        message: "Choose two different identity elements.",
      });
    }

    if (!value.identityElements.includes("FULL_NAME")) {
      context.addIssue({
        code: "custom",
        path: ["identityElements"],
        message: "Full name must be one of the verified identity elements.",
      });
    }

    if (value.identityElements.includes("DATE_OF_BIRTH") && !value.dateOfBirth) {
      context.addIssue({
        code: "custom",
        path: ["dateOfBirth"],
        message: "Date of birth is required when it is used as an identity element.",
      });
    }
  });

export type PatientDuplicateCheckInput = z.infer<typeof patientDuplicateCheckSchema>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type PatientMatchedIdentifier = "FULL_NAME" | "DATE_OF_BIRTH" | "PHONE";

export interface PatientDuplicateComparable {
  id: string;
  mrn: string;
  isActive: boolean;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date | null;
  contacts: Array<{ normalizedValue: string }>;
}

export interface PatientDuplicateCandidate {
  patientId: string;
  mrn: string;
  isActive: boolean;
  displayName: string;
  dateOfBirth: string | null;
  matchedIdentifiers: PatientMatchedIdentifier[];
  confidence: "HIGH" | "REVIEW";
}

export function normalizePatientName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

/** Normalize ASCII, Arabic-Indic, and Eastern Arabic-Indic digits consistently. */
export function normalizePatientPhone(value: string): string {
  const normalizedDigits = Array.from(value.normalize("NFKC"), (character) => {
    const code = character.codePointAt(0) ?? 0;
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
    return character;
  }).join("");

  return normalizedDigits.replace(/\D/g, "");
}

/**
 * Produce a comparison key for Egyptian national numbers while preserving the
 * original digits-only normalizer used for stored contact values. Local 0-prefixed
 * numbers and their +20 country-code representation must compare as the same phone.
 */
export function getPatientPhoneMatchKey(value: string): string {
  const digits = normalizePatientPhone(value);
  if (digits.startsWith("0020")) return digits.slice(2);
  if (digits.startsWith("0") && (digits.length === 10 || digits.length === 11)) {
    return `20${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Include both canonical and legacy digits-only forms in database lookups. Existing
 * PatientContact.normalizedValue rows may have been saved before local/+20
 * equivalence was introduced, so a single exact lookup would miss them.
 */
export function getPatientPhoneLookupValues(value: string): string[] {
  const digits = normalizePatientPhone(value);
  const matchKey = getPatientPhoneMatchKey(value);
  const variants = new Set([digits, matchKey]);

  if (matchKey.startsWith("20") && (matchKey.length === 11 || matchKey.length === 12)) {
    variants.add(`0${matchKey.slice(2)}`);
  }

  return [...variants];
}

export function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getCairoDateString(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) throw new Error("Could not resolve the clinic-local date.");
  return `${year}-${month}-${day}`;
}

export function getPatientIdentityMatches(
  input: PatientDuplicateCheckInput,
  patient: PatientDuplicateComparable,
): PatientMatchedIdentifier[] {
  const targetName = normalizePatientName(
    [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" "),
  );
  const storedName = normalizePatientName(
    [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(" "),
  );
  const matches: PatientMatchedIdentifier[] = [];

  if (targetName === storedName) matches.push("FULL_NAME");

  if (
    input.dateOfBirth &&
    patient.dateOfBirth &&
    patient.dateOfBirth.toISOString().slice(0, 10) === input.dateOfBirth
  ) {
    matches.push("DATE_OF_BIRTH");
  }

  const targetPhone = getPatientPhoneMatchKey(input.phone);
  if (
    patient.contacts.some(
      (contact) => getPatientPhoneMatchKey(contact.normalizedValue) === targetPhone,
    )
  ) {
    matches.push("PHONE");
  }

  return matches;
}

export function toPatientDuplicateCandidate(
  input: PatientDuplicateCheckInput,
  patient: PatientDuplicateComparable,
): PatientDuplicateCandidate | null {
  const matchedIdentifiers = getPatientIdentityMatches(input, patient);
  if (matchedIdentifiers.length === 0) return null;

  return {
    patientId: patient.id,
    mrn: patient.mrn,
    isActive: patient.isActive,
    displayName: [patient.firstName, patient.middleName, patient.lastName]
      .filter(Boolean)
      .join(" "),
    dateOfBirth: patient.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    matchedIdentifiers,
    confidence:
      matchedIdentifiers.includes("FULL_NAME") && matchedIdentifiers.includes("DATE_OF_BIRTH")
        ? "HIGH"
        : "REVIEW",
  };
}
