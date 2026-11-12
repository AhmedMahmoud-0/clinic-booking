import { z } from "zod";

import { patientIdentityVerificationSchema } from "../patient-management/identity-verification-validation";

const phoneSchema = z.string().trim().min(7).max(30).regex(/^[+()\d .-]+$/);
const patientDetailsSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "NOT_SPECIFIED"]).nullable().optional(),
  phone: phoneSchema.nullable().optional(),
}).strict();

const externalLabIntakeFields = {
  requestSource: z.enum(["PAPER", "ELECTRONIC"]),
  referringProviderName: z.string().trim().min(2).max(180),
  referringFacilityName: z.string().trim().min(2).max(180),
  referringProviderContact: z.string().trim().max(100).nullable().optional(),
  externalRequestReference: z.string().trim().max(80).nullable().optional(),
  requestNotes: z.string().trim().max(1000).nullable().optional(),
  priority: z.enum(["ROUTINE", "URGENT"]).default("ROUTINE"),
  labTestIds: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
};

export const externalLabIntakeUnionSchema = z.discriminatedUnion("patientMode", [
  z.object({ patientMode: z.literal("NEW"), patient: patientDetailsSchema, ...externalLabIntakeFields }).strict(),
  z.object({
    patientMode: z.literal("EXISTING"),
    existingPatientId: z.string().trim().min(1).max(80),
    identityVerification: patientIdentityVerificationSchema,
    ...externalLabIntakeFields,
  }).strict(),
]).superRefine((value, context) => {
  if (new Set(value.labTestIds).size !== value.labTestIds.length) {
    context.addIssue({ code: "custom", path: ["labTestIds"], message: "Choose each laboratory test only once." });
  }
  if (value.patientMode === "NEW" && value.patient.dateOfBirth) {
    const date = new Date(`${value.patient.dateOfBirth}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value.patient.dateOfBirth) {
      context.addIssue({ code: "custom", path: ["patient", "dateOfBirth"], message: "Enter a real calendar date." });
    }
  }
});

export const externalLabReferralRequestSchema = z.object({
  testName: z.string().trim().min(2).max(180),
  reason: z.string().trim().min(2).max(1000),
  externalFacilityName: z.string().trim().min(2).max(180),
  externalFacilityContact: z.string().trim().max(100).nullable().optional(),
  consent: z.object({
    signerPatientId: z.string().trim().min(1).max(80),
    signerType: z.enum(["PATIENT", "LEGAL_GUARDIAN"]),
    signerNameSnapshot: z.string().trim().min(2).max(220),
    captureMethod: z.enum(["WRITTEN", "VERBAL"]),
    documentVersion: z.string().trim().min(1).max(40),
  }).strict(),
}).strict();

export const externalLabResultRequestSchema = z.object({
  resultSummary: z.string().trim().min(1).max(12000),
}).strict();

export const externalLabReviewRequestSchema = z.object({
  reviewNotes: z.string().trim().min(1).max(1000),
}).strict();

export const externalLabCancelRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500),
}).strict();

export const patientRecordConversionRequestSchema = z.object({
  reason: z.string().trim().min(10).max(500),
  identityVerification: patientIdentityVerificationSchema,
}).strict();

export type ExternalLabIntakeRequest = z.infer<typeof externalLabIntakeUnionSchema>;
export type ExternalLabReferralRequest = z.infer<typeof externalLabReferralRequestSchema>;
export type ExternalLabResultRequest = z.infer<typeof externalLabResultRequestSchema>;
export type ExternalLabReviewRequest = z.infer<typeof externalLabReviewRequestSchema>;
export type ExternalLabCancelRequest = z.infer<typeof externalLabCancelRequestSchema>;
export type PatientRecordConversionRequest = z.infer<typeof patientRecordConversionRequestSchema>;
