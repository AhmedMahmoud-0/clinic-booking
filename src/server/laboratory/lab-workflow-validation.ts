import { z } from "zod";
import { patientIdentityVerificationSchema, type PatientIdentityVerificationInput } from "../patient-management/identity-verification-validation";

const labAbnormalFlagSchema = z.enum([
  "NOT_INDICATED",
  "NORMAL",
  "LOW",
  "HIGH",
  "CRITICAL_LOW",
  "CRITICAL_HIGH",
  "ABNORMAL",
]);

export const labWorklistQuerySchema = z.object({}).strict();

export const labOrderItemIdSchema = z.string().trim().min(1).max(80);
export const labSampleIdSchema = z.string().trim().min(1).max(80);

export const labSampleCollectionRequestSchema = z.object({
  identityVerification: patientIdentityVerificationSchema,
  collectionNotes: z.string().trim().max(500).nullable().optional(),
}).strict();

export const labSampleTransitionRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("RECEIVE") }).strict(),
  z.object({
    action: z.literal("REJECT"),
    reason: z.string().trim().min(1).max(500),
  }).strict(),
]);

const labResultValueRequestSchema = z.object({
  componentCode: z.string().trim().min(1).max(40),
  valueText: z.string().trim().max(1000).nullable().optional(),
  valueNumeric: z.number().finite().nullable().optional(),
  valueBoolean: z.boolean().nullable().optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  referenceRange: z.string().trim().max(160).nullable().optional(),
  abnormalFlag: labAbnormalFlagSchema.default("NOT_INDICATED"),
}).strict();

export const labResultDraftRequestSchema = z.object({
  resultSummary: z.string().trim().max(10_000).nullable().optional(),
  values: z.array(labResultValueRequestSchema).max(100).default([]),
}).strict().superRefine((input, context) => {
  const codes = input.values.map((value) => value.componentCode);
  if (new Set(codes).size !== codes.length) {
    context.addIssue({
      code: "custom",
      path: ["values"],
      message: "A test component can appear only once in a result draft.",
    });
  }
  if (input.values.length === 0 && !input.resultSummary?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["resultSummary"],
      message: "Enter a result summary or at least one component value.",
    });
  }
});

export type LabSampleCollectionRequest = z.infer<typeof labSampleCollectionRequestSchema> & { identityVerification: PatientIdentityVerificationInput };
export type LabSampleTransitionRequest = z.infer<typeof labSampleTransitionRequestSchema>;
export type LabResultDraftRequest = z.infer<typeof labResultDraftRequestSchema>;
