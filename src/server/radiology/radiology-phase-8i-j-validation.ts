import { z } from "zod";

export const radiologyPhaseRecordIdSchema = z.string().trim().min(1).max(80);

export const radiologyExamCompletionRequestSchema = z.object({
  notes: z.string().trim().max(1000).nullable().optional(),
}).strict();

export const radiologyReportDraftRequestSchema = z.object({
  findings: z.string().trim().min(1).max(20000),
  impression: z.string().trim().min(1).max(5000),
  recommendations: z.string().trim().max(5000).nullable().optional(),
  isCritical: z.boolean().default(false),
  criticalReason: z.string().trim().min(1).max(1000).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.isCritical && !value.criticalReason?.trim()) {
    context.addIssue({ code: "custom", path: ["criticalReason"], message: "A reason is required when the report is marked critical." });
  }
  if (!value.isCritical && value.criticalReason?.trim()) {
    context.addIssue({ code: "custom", path: ["criticalReason"], message: "A critical reason is only valid for a report marked critical." });
  }
});

export const radiologyReportReviewRequestSchema = z.object({
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  comments: z.string().trim().max(1000).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.decision === "CHANGES_REQUESTED" && !value.comments?.trim()) {
    context.addIssue({ code: "custom", path: ["comments"], message: "A review comment is required when changes are requested." });
  }
});

export const radiologyCriticalCommunicationRequestSchema = z.object({
  method: z.enum(["PHONE", "IN_PERSON", "SECURE_MESSAGE"]),
  communicatedToName: z.string().trim().min(2).max(160),
}).strict();

export const radiologyCriticalAcknowledgementRequestSchema = z.object({
  readBackConfirmed: z.literal(true),
  resolutionNotes: z.string().trim().max(1000).nullable().optional(),
}).strict();

export const radiologyCriticalEscalationRequestSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
}).strict();

export const doctorRadiologyClinicalReviewRequestSchema = z.object({
  decision: z.enum(["REVIEWED", "FOLLOW_UP_REQUIRED"]),
  notes: z.string().trim().max(1000).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.decision === "FOLLOW_UP_REQUIRED" && !value.notes?.trim()) {
    context.addIssue({ code: "custom", path: ["notes"], message: "Notes are required when follow-up is required." });
  }
});

const externalRadiologyConsentSchema = z.object({
  signerPatientId: z.string().trim().min(1).max(80),
  signerType: z.enum(["PATIENT", "LEGAL_GUARDIAN"]),
  signerNameSnapshot: z.string().trim().min(2).max(220),
  captureMethod: z.enum(["WRITTEN", "VERBAL"]),
  documentVersion: z.string().trim().min(1).max(40),
}).strict();

export const externalRadiologyReferralRequestSchema = z.object({
  procedureName: z.string().trim().min(2).max(180),
  reason: z.string().trim().min(2).max(1000),
  externalFacilityName: z.string().trim().min(2).max(180),
  externalFacilityContact: z.string().trim().max(100).nullable().optional(),
  consent: externalRadiologyConsentSchema,
}).strict();

export const externalRadiologyResultRequestSchema = z.object({
  findings: z.string().trim().min(1).max(20000),
  impression: z.string().trim().min(1).max(5000),
  recommendations: z.string().trim().max(5000).nullable().optional(),
  performedAt: z.string().trim().min(1).max(50).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.performedAt && Number.isNaN(Date.parse(value.performedAt))) {
    context.addIssue({ code: "custom", path: ["performedAt"], message: "Enter a valid performed-at date/time." });
  }
});

export const externalRadiologyReviewRequestSchema = z.object({
  decision: z.enum(["REVIEWED", "FOLLOW_UP_REQUIRED"]),
  notes: z.string().trim().max(1000).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.decision === "FOLLOW_UP_REQUIRED" && !value.notes?.trim()) {
    context.addIssue({ code: "custom", path: ["notes"], message: "Notes are required when follow-up is required." });
  }
});

export type RadiologyExamCompletionRequest = z.infer<typeof radiologyExamCompletionRequestSchema>;
export type RadiologyReportDraftRequest = z.infer<typeof radiologyReportDraftRequestSchema>;
export type RadiologyReportReviewRequest = z.infer<typeof radiologyReportReviewRequestSchema>;
export type RadiologyCriticalCommunicationRequest = z.infer<typeof radiologyCriticalCommunicationRequestSchema>;
export type RadiologyCriticalAcknowledgementRequest = z.infer<typeof radiologyCriticalAcknowledgementRequestSchema>;
export type RadiologyCriticalEscalationRequest = z.infer<typeof radiologyCriticalEscalationRequestSchema>;
export type DoctorRadiologyClinicalReviewRequest = z.infer<typeof doctorRadiologyClinicalReviewRequestSchema>;
export type ExternalRadiologyReferralRequest = z.infer<typeof externalRadiologyReferralRequestSchema>;
export type ExternalRadiologyResultRequest = z.infer<typeof externalRadiologyResultRequestSchema>;
export type ExternalRadiologyReviewRequest = z.infer<typeof externalRadiologyReviewRequestSchema>;
