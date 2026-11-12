import { describe, expect, it } from "vitest";
import {
  billingReportQuerySchema,
  completeRefundSchema,
  createBillingInvoiceDraftRequestSchema,
  discountRequestSchema,
  managerDecisionSchema,
  refundRequestSchema,
} from "../../src/server/billing/billing-phase-9b-validation";

describe("Phase 9B strict request validation", () => {
  it("accepts exactly one supported billing source", () => {
    expect(createBillingInvoiceDraftRequestSchema.safeParse({ encounterId: "encounter-1" }).success).toBe(true);
    expect(createBillingInvoiceDraftRequestSchema.safeParse({ encounterId: "walkin-1", walkInDoctorServiceId: "service-1" }).success).toBe(true);
    expect(createBillingInvoiceDraftRequestSchema.safeParse({ externalLabIntakeId: "intake-1" }).success).toBe(true);
    expect(createBillingInvoiceDraftRequestSchema.safeParse({ encounterId: "encounter-1", externalLabIntakeId: "intake-1" }).success).toBe(false);
    expect(createBillingInvoiceDraftRequestSchema.safeParse({ externalLabIntakeId: "intake-1", patientId: "forged-patient" }).success).toBe(false);
  });

  it("requires a positive decimal discount and a recorded reason", () => {
    expect(discountRequestSchema.safeParse({ amount: "50.25", reason: "Approved courtesy adjustment" }).success).toBe(true);
    expect(discountRequestSchema.safeParse({ amount: "0", reason: "Reason" }).success).toBe(false);
    expect(discountRequestSchema.safeParse({ amount: "1.234", reason: "Reason" }).success).toBe(false);
    expect(discountRequestSchema.safeParse({ amount: "10", reason: "No" }).success).toBe(false);
    expect(discountRequestSchema.safeParse({ amount: "10", reason: "Valid reason", approvedByEmployeeId: "forged" }).success).toBe(false);
  });

  it("requires a reason when a manager rejects a discount or refund", () => {
    expect(managerDecisionSchema.safeParse({ decision: "APPROVE" }).success).toBe(true);
    expect(managerDecisionSchema.safeParse({ decision: "REJECT" }).success).toBe(false);
    expect(managerDecisionSchema.safeParse({ decision: "REJECT", reason: "Incorrect request" }).success).toBe(true);
    expect(managerDecisionSchema.safeParse({ decision: "APPROVE", decidedByEmployeeId: "forged" }).success).toBe(false);
  });

  it("requires unique selected invoice lines for a refund", () => {
    expect(refundRequestSchema.safeParse({ reason: "Service was not provided", items: [{ invoiceItemId: "line-1" }] }).success).toBe(true);
    expect(refundRequestSchema.safeParse({ reason: "Service was not provided", items: [] }).success).toBe(false);
    expect(refundRequestSchema.safeParse({ reason: "Service was not provided", items: [{ invoiceItemId: "line-1" }, { invoiceItemId: "line-1" }] }).success).toBe(false);
    expect(refundRequestSchema.safeParse({ reason: "Service was not provided", items: [{ invoiceItemId: "line-1" }], amount: "100" }).success).toBe(false);
  });

  it("accepts an optional bounded external refund reference", () => {
    expect(completeRefundSchema.safeParse({}).success).toBe(true);
    expect(completeRefundSchema.safeParse({ transactionReference: "POS-REF-01" }).success).toBe(true);
    expect(completeRefundSchema.safeParse({ transactionReference: " " }).success).toBe(false);
    expect(completeRefundSchema.safeParse({ transactionReference: "x".repeat(121) }).success).toBe(false);
    expect(completeRefundSchema.safeParse({ paymentMethod: "CASH" }).success).toBe(false);
  });

  it("bounds financial reports to valid Cairo calendar ranges of at most 93 days", () => {
    expect(billingReportQuerySchema.safeParse({ from: "2026-01-01", to: "2026-04-03" }).success).toBe(true);
    expect(billingReportQuerySchema.safeParse({ from: "2026-01-01", to: "2026-04-04" }).success).toBe(false);
    expect(billingReportQuerySchema.safeParse({ from: "2026-02-30", to: "2026-03-01" }).success).toBe(false);
    expect(billingReportQuerySchema.safeParse({ from: "2026-03-02", to: "2026-03-01" }).success).toBe(false);
  });
});
