import { z } from "zod";

const recordId = z.string().trim().min(1).max(80);
export const complaintStatuses = ["RECEIVED", "ACKNOWLEDGED", "IN_REVIEW", "RESOLVED", "CLOSED", "REJECTED"] as const;
export type ComplaintStatus = (typeof complaintStatuses)[number];

export const incidentCategories = ["CLINICAL", "PATIENT_SAFETY", "FACILITY", "PRIVACY", "SECURITY", "OPERATIONAL", "OTHER"] as const;
export const incidentSeverities = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export const incidentStatuses = ["UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED", "CLOSED"] as const;

export const createReceptionComplaintSchema = z.object({
  channel: z.enum(["PHONE", "IN_PERSON"]),
  category: z.enum(["APPOINTMENT", "STAFF_CONDUCT", "WAIT_TIME", "BILLING", "FACILITY", "SERVICE_QUALITY", "OTHER"]),
  subject: z.string().trim().min(4).max(180),
  description: z.string().trim().min(20).max(5000),
  submitterName: z.string().trim().max(160).optional(),
  submitterPhone: z.string().trim().max(30).optional(),
  submitterEmail: z.string().trim().email().max(254).optional(),
}).strict();
export type CreateReceptionComplaintInput = z.infer<typeof createReceptionComplaintSchema>;

export const complaintListQuerySchema = z.object({
  status: z.enum(complaintStatuses).optional(),
}).strict();

export const complaintTransitionSchema = z.object({
  status: z.enum(["ACKNOWLEDGED", "IN_REVIEW", "RESOLVED", "CLOSED", "REJECTED"]),
  note: z.string().trim().min(3).max(1000).optional(),
}).strict().superRefine((value, context) => {
  if (["RESOLVED", "CLOSED", "REJECTED"].includes(value.status) && !value.note) {
    context.addIssue({ code: "custom", path: ["note"], message: "A note is required for this complaint decision." });
  }
});

export const createIncidentSchema = z.object({
  category: z.enum(incidentCategories),
  severity: z.enum(incidentSeverities),
  occurredAt: z.string().datetime({ offset: true }),
  summary: z.string().trim().min(4).max(180),
  description: z.string().trim().min(20).max(5000),
  immediateActions: z.string().trim().max(3000).optional(),
}).strict();
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const incidentTransitionSchema = z.object({
  status: z.enum(incidentStatuses),
  note: z.string().trim().min(3).max(2000).optional(),
}).strict().superRefine((value, context) => {
  if (["RESOLVED", "CLOSED"].includes(value.status) && !value.note) {
    context.addIssue({ code: "custom", path: ["note"], message: "Resolution notes are required before resolving or closing an incident." });
  }
});

export const operationalReportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict().superRefine((value, context) => {
  const from = new Date(`${value.from}T00:00:00.000Z`);
  const to = new Date(`${value.to}T00:00:00.000Z`);
  if (Number.isNaN(from.getTime()) || from.toISOString().slice(0, 10) !== value.from) {
    context.addIssue({ code: "custom", path: ["from"], message: "Start date is invalid." });
  }
  if (Number.isNaN(to.getTime()) || to.toISOString().slice(0, 10) !== value.to) {
    context.addIssue({ code: "custom", path: ["to"], message: "End date is invalid." });
  }
  if (from > to) context.addIssue({ code: "custom", path: ["to"], message: "End date must not precede start date." });
  if ((to.getTime() - from.getTime()) / 86_400_000 > 92) {
    context.addIssue({ code: "custom", path: ["to"], message: "A report may cover at most 93 calendar days." });
  }
});
export type OperationalReportQuery = z.infer<typeof operationalReportQuerySchema>;

export const managerRecordIdSchema = recordId;
