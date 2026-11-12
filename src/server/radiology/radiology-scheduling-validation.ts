import { z } from "zod";
import { patientIdentityVerificationSchema } from "../patient-management/identity-verification-validation";

const nonEmptyId = z.string().trim().min(1).max(80);
const isoDateTime = z.string().datetime({ offset: true });

export const radiologyScheduleRequestSchema = z.object({
  resourceId: nonEmptyId,
  scheduledStartsAt: isoDateTime,
}).strict();

export const radiologyIdentityVerificationRequestSchema = z.object({
  identityVerification: patientIdentityVerificationSchema,
}).strict();

export const radiologyPreparationRequestSchema = z.object({
  status: z.enum(["CONFIRMED", "NOT_REQUIRED", "ISSUE_REPORTED"]),
  notes: z.string().trim().max(1000).nullable().optional(),
}).strict().superRefine((value, context) => {
  if ((value.status === "NOT_REQUIRED" || value.status === "ISSUE_REPORTED") && !value.notes?.trim()) {
    context.addIssue({ code: "custom", path: ["notes"], message: "A reason is required for this preparation decision." });
  }
});

export const radiologyPregnancyScreeningRequestSchema = z.object({
  result: z.enum(["NOT_APPLICABLE", "NEGATIVE", "POSITIVE", "DECLINED"]),
  notes: z.string().trim().max(1000).nullable().optional(),
}).strict().superRefine((value, context) => {
  if ((value.result === "NOT_APPLICABLE" || value.result === "DECLINED") && !value.notes?.trim()) {
    context.addIssue({ code: "custom", path: ["notes"], message: "A reason is required for this screening response." });
  }
});

export const radiologyPregnancyReviewRequestSchema = z.object({
  decision: z.enum(["AUTHORIZE_AFTER_REVIEW", "DEFER_EXAM"]),
  notes: z.string().trim().min(5).max(1000),
}).strict();

export type RadiologyScheduleRequest = z.infer<typeof radiologyScheduleRequestSchema>;
export type RadiologyIdentityVerificationRequest = z.infer<typeof radiologyIdentityVerificationRequestSchema>;
export type RadiologyPreparationRequest = z.infer<typeof radiologyPreparationRequestSchema>;
export type RadiologyPregnancyScreeningRequest = z.infer<typeof radiologyPregnancyScreeningRequestSchema>;
export type RadiologyPregnancyReviewRequest = z.infer<typeof radiologyPregnancyReviewRequestSchema>;
