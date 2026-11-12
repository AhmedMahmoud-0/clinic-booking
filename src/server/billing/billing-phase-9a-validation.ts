import { z } from "zod";

export const billingPhaseRecordIdSchema = z.string().trim().min(1).max(80);

export const createInvoiceDraftRequestSchema = z.object({
  encounterId: billingPhaseRecordIdSchema,
}).strict();

export const invoiceWorklistQuerySchema = z.object({
  status: z.enum(["DRAFT", "ISSUED", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "VOIDED"]).optional(),
  q: z.string().trim().min(1).max(100).optional(),
}).strict();

export const collectFullPaymentRequestSchema = z.object({
  method: z.enum(["CASH", "POS_CARD", "CLINIC_E_WALLET"]),
  transactionReference: z.string().trim().min(1).max(120).nullable().optional(),
}).strict().superRefine((value, context) => {
  const reference = value.transactionReference?.trim();
  if (value.method !== "CASH" && !reference) {
    context.addIssue({
      code: "custom",
      path: ["transactionReference"],
      message: "A transaction reference is required for POS card and clinic e-wallet payments.",
    });
  }
});

export type CreateInvoiceDraftRequest = z.infer<typeof createInvoiceDraftRequestSchema>;
export type InvoiceWorklistQuery = z.infer<typeof invoiceWorklistQuerySchema>;
export type CollectFullPaymentRequest = z.infer<typeof collectFullPaymentRequestSchema>;

export const emptyBillingActionRequestSchema = z.object({}).strict();


export const invoiceCandidateQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
}).strict();
export type InvoiceCandidateQuery = z.infer<typeof invoiceCandidateQuerySchema>;
