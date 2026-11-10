import { z } from "zod";

import { normalizePatientPhone } from "./validation";

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .refine((value) => {
    const digits = normalizePatientPhone(value);
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a phone number containing 7 to 15 digits.");
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const nameSchema = z.string().trim().min(2).max(180).refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
const addressLineSchema = z.string().trim().min(2).max(180);
const addressPartSchema = z.string().trim().max(100).nullable().optional();

const addContactSchema = z.object({
  action: z.literal("ADD_CONTACT"),
  type: z.enum(["PHONE", "EMAIL"]),
  value: z.string().trim().min(1).max(254),
  isPrimary: z.boolean().optional().default(false),
}).strict().superRefine((value, context) => {
  if (value.type === "PHONE" && !phoneSchema.safeParse(value.value).success) {
    context.addIssue({ code: "custom", path: ["value"], message: "Enter a valid phone number." });
  }
  if (value.type === "EMAIL" && !emailSchema.safeParse(value.value).success) {
    context.addIssue({ code: "custom", path: ["value"], message: "Enter a valid email address." });
  }
});

const contactRecordActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SET_PRIMARY_CONTACT"), contactId: z.string().trim().min(1).max(80) }).strict(),
  z.object({ action: z.literal("DEACTIVATE_CONTACT"), contactId: z.string().trim().min(1).max(80) }).strict(),
]);

const addAddressSchema = z.object({
  action: z.literal("ADD_ADDRESS"),
  type: z.enum(["HOME", "WORK", "OTHER"]).default("HOME"),
  addressLine1: addressLineSchema,
  addressLine2: addressPartSchema,
  district: addressPartSchema,
  city: z.string().trim().min(2).max(100),
  governorate: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(20).nullable().optional(),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).default("EG"),
  isPrimary: z.boolean().optional().default(false),
}).strict();

const addressRecordActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SET_PRIMARY_ADDRESS"), addressId: z.string().trim().min(1).max(80) }).strict(),
  z.object({ action: z.literal("DEACTIVATE_ADDRESS"), addressId: z.string().trim().min(1).max(80) }).strict(),
]);

const addEmergencyContactSchema = z.object({
  action: z.literal("ADD_EMERGENCY_CONTACT"),
  fullName: nameSchema,
  relationshipType: z.enum(["PARENT", "CHILD", "SPOUSE", "SIBLING", "OTHER"]),
  phone: phoneSchema,
  isPrimary: z.boolean().optional().default(false),
}).strict();

const emergencyRecordActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SET_PRIMARY_EMERGENCY_CONTACT"), emergencyContactId: z.string().trim().min(1).max(80) }).strict(),
  z.object({ action: z.literal("DEACTIVATE_EMERGENCY_CONTACT"), emergencyContactId: z.string().trim().min(1).max(80) }).strict(),
]);

export const patientContactProfileCommandSchema = z
  .discriminatedUnion("action", [
    addContactSchema,
    ...contactRecordActionSchema.options,
    addAddressSchema,
    ...addressRecordActionSchema.options,
    addEmergencyContactSchema,
    ...emergencyRecordActionSchema.options,
  ])
  .transform((command) => {
    // Keep phone formatting as entered (after trimming), but canonicalize email
    // addresses before they reach persistence and duplicate-contact checks.
    if (command.action === "ADD_CONTACT" && command.type === "EMAIL") {
      return { ...command, value: command.value.toLowerCase() };
    }

    return command;
  });

export const patientConsentRecordSchema = z.object({
  consentType: z.enum([
    "PRIVACY_NOTICE",
    "PERSONAL_DATA_PROCESSING",
    "GENERAL_TREATMENT",
    "EMAIL_COMMUNICATION",
    "PHONE_COMMUNICATION",
  ]),
  decision: z.enum(["GRANTED", "REFUSED", "WITHDRAWN"]),
  captureMethod: z.enum(["WRITTEN", "VERBAL"]),
  documentVersion: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  signerPatientId: z.string().trim().min(1).max(80),
}).strict();

export type PatientContactProfileCommand = z.infer<typeof patientContactProfileCommandSchema>;
export type PatientConsentRecordInput = z.infer<typeof patientConsentRecordSchema>;
