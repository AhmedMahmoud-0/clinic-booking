import { z } from "zod";

// Reuse the canonical Phase 8A-C identifier schema for LabOrderItem routes.
export { labOrderItemIdSchema } from "./lab-workflow-validation";

export const labResultReviewIdSchema = z.string().trim().min(1).max(80);
export const labResultSubmissionSchema = z.object({}).strict();
export const labResultReviewRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().trim().max(1000).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.decision === "REJECTED" && !value.comments?.trim()) {
    context.addIssue({ code: "custom", path: ["comments"], message: "A review comment is required when returning a result for correction." });
  }
});
export const labCriticalCommunicationRequestSchema = z.object({
  method: z.enum(["PHONE", "IN_PERSON", "SECURE_MESSAGE"]),
  communicatedToName: z.string().trim().min(2).max(160),
}).strict();
export const labCriticalAcknowledgementRequestSchema = z.object({
  readBackConfirmed: z.literal(true),
  resolutionNotes: z.string().trim().max(1000).nullable().optional(),
}).strict();
export const labCriticalEscalationRequestSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
}).strict();
export const doctorLabClinicalReviewRequestSchema = z.object({
  decision: z.enum(["REVIEWED", "FOLLOW_UP_REQUIRED"]),
  notes: z.string().trim().max(1000).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.decision === "FOLLOW_UP_REQUIRED" && !value.notes?.trim()) {
    context.addIssue({ code: "custom", path: ["notes"], message: "Notes are required when follow-up is required." });
  }
});

export type LabResultReviewRequest = z.infer<typeof labResultReviewRequestSchema>;
export type LabCriticalCommunicationRequest = z.infer<typeof labCriticalCommunicationRequestSchema>;
export type LabCriticalAcknowledgementRequest = z.infer<typeof labCriticalAcknowledgementRequestSchema>;
export type LabCriticalEscalationRequest = z.infer<typeof labCriticalEscalationRequestSchema>;
export type DoctorLabClinicalReviewRequest = z.infer<typeof doctorLabClinicalReviewRequestSchema>;
