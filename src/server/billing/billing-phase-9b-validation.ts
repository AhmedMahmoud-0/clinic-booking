import { z } from "zod";

const recordId = z.string().trim().min(1).max(80);
const moneyAmount = z.string().trim().regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/, "Enter a valid amount with up to two decimal places.")
  .refine((value) => Number(value) > 0, "Amount must be greater than zero.");
const reason = z.string().trim().min(3).max(500);

export const createBillingInvoiceDraftRequestSchema = z.union([
  z.object({ encounterId: recordId, walkInDoctorServiceId: recordId.optional() }).strict(),
  z.object({ externalLabIntakeId: recordId }).strict(),
]);
export type CreateBillingInvoiceDraftRequest = z.infer<typeof createBillingInvoiceDraftRequestSchema>;

export const discountRequestSchema = z.object({ amount: moneyAmount, reason }).strict();
export type DiscountRequest = z.infer<typeof discountRequestSchema>;

export const managerDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().min(3).max(500).optional(),
}).strict().superRefine((value, context) => {
  if (value.decision === "REJECT" && !value.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "A reason is required when rejecting a request." });
  }
});
export type ManagerDecision = z.infer<typeof managerDecisionSchema>;

export const refundRequestSchema = z.object({
  reason,
  items: z.array(z.object({
    invoiceItemId: recordId,
    reason: z.string().trim().min(3).max(500).optional(),
  }).strict()).min(1).max(20),
}).strict().superRefine((value, context) => {
  const ids = value.items.map((item) => item.invoiceItemId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "An invoice item may only appear once in a refund request." });
  }
});
export type RefundRequest = z.infer<typeof refundRequestSchema>;

export const completeRefundSchema = z.object({
  transactionReference: z.string().trim().min(1).max(120).optional(),
}).strict();
export type CompleteRefundRequest = z.infer<typeof completeRefundSchema>;

export const billingReportQuerySchema = z.object({
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
export type BillingReportQuery = z.infer<typeof billingReportQuerySchema>;

export const externalIntakeCandidateQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
}).strict();
export type ExternalIntakeCandidateQuery = z.infer<typeof externalIntakeCandidateQuerySchema>;

export const billingPhaseRecordIdSchema = recordId;
