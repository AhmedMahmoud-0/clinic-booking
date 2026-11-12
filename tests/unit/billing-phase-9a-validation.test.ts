import { describe, expect, it } from "vitest";
import {
  collectFullPaymentRequestSchema,
  createInvoiceDraftRequestSchema,
  emptyBillingActionRequestSchema,
  invoiceWorklistQuerySchema,
  invoiceCandidateQuerySchema,
} from "../../src/server/billing/billing-phase-9a-validation";

describe("Phase 9A billing request validation", () => {
  it("accepts only an encounter identifier for invoice draft creation", () => {
    expect(createInvoiceDraftRequestSchema.safeParse({ encounterId: "encounter-123" }).success).toBe(true);
    expect(createInvoiceDraftRequestSchema.safeParse({ encounterId: "encounter-123", patientId: "patient-1" }).success).toBe(false);
    expect(createInvoiceDraftRequestSchema.safeParse({ encounterId: "" }).success).toBe(false);
  });

  it("accepts only supported invoice worklist filters", () => {
    expect(invoiceWorklistQuerySchema.safeParse({ status: "PAID", q: "MRN-100" }).success).toBe(true);
    expect(invoiceWorklistQuerySchema.safeParse({ status: "PENDING" }).success).toBe(false);
    expect(invoiceWorklistQuerySchema.safeParse({ q: "   " }).success).toBe(false);
    expect(invoiceWorklistQuerySchema.safeParse({ q: "invoice", patientId: "patient-1" }).success).toBe(false);
  });

  it("accepts a bounded search term for eligible completed encounters", () => {
    expect(invoiceCandidateQuerySchema.safeParse({}).success).toBe(true);
    expect(invoiceCandidateQuerySchema.safeParse({ q: "MRN-100" }).success).toBe(true);
    expect(invoiceCandidateQuerySchema.safeParse({ q: "   " }).success).toBe(false);
    expect(invoiceCandidateQuerySchema.safeParse({ q: "visit", encounterId: "enc-1" }).success).toBe(false);
  });

  it("requires a reference for POS card and clinic wallet transactions", () => {
    expect(collectFullPaymentRequestSchema.safeParse({ method: "CASH" }).success).toBe(true);
    expect(collectFullPaymentRequestSchema.safeParse({ method: "CASH", transactionReference: "CASH-01" }).success).toBe(true);
    expect(collectFullPaymentRequestSchema.safeParse({ method: "POS_CARD" }).success).toBe(false);
    expect(collectFullPaymentRequestSchema.safeParse({ method: "POS_CARD", transactionReference: "POS-REF-01" }).success).toBe(true);
    expect(collectFullPaymentRequestSchema.safeParse({ method: "CLINIC_E_WALLET", transactionReference: "WALLET-REF-01" }).success).toBe(true);
  });

  it("rejects caller-supplied amounts, partial-payment fields, and unsupported methods", () => {
    expect(collectFullPaymentRequestSchema.safeParse({ method: "CASH", amount: "10.00" }).success).toBe(false);
    expect(collectFullPaymentRequestSchema.safeParse({ method: "CASH", partial: true }).success).toBe(false);
    expect(collectFullPaymentRequestSchema.safeParse({ method: "ONLINE_GATEWAY" }).success).toBe(false);
  });

  it("accepts an empty body only for the explicit invoice issue action", () => {
    expect(emptyBillingActionRequestSchema.safeParse({}).success).toBe(true);
    expect(emptyBillingActionRequestSchema.safeParse({ status: "ISSUED" }).success).toBe(false);
  });
});
