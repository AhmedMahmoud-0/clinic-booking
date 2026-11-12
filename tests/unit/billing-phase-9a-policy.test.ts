import { describe, expect, it } from "vitest";
import {
  canCollectFullPayment,
  canCreateInvoiceDraft,
  canIssueInvoice,
  isSupportedPaymentMethod,
  paymentMethodRequiresReference,
  toCents,
} from "../../src/server/billing/billing-phase-9a-policy";

describe("Phase 9A invoice eligibility", () => {
  it("allows draft preparation only after an encounter is completed", () => {
    expect(canCreateInvoiceDraft("COMPLETED")).toBe(true);
    expect(canCreateInvoiceDraft("IN_PROGRESS")).toBe(false);
    expect(canCreateInvoiceDraft("CANCELLED")).toBe(false);
  });

  it("issues only a non-empty draft after every service is complete", () => {
    const valid = { invoiceStatus: "DRAFT" as const, itemCount: 3, hasPendingServices: false, totalCents: 155000 };
    expect(canIssueInvoice(valid)).toBe(true);
    expect(canIssueInvoice({ ...valid, invoiceStatus: "ISSUED" })).toBe(false);
    expect(canIssueInvoice({ ...valid, itemCount: 0 })).toBe(false);
    expect(canIssueInvoice({ ...valid, hasPendingServices: true })).toBe(false);
    expect(canIssueInvoice({ ...valid, totalCents: 0 })).toBe(false);
    expect(canIssueInvoice({ ...valid, totalCents: -1 })).toBe(false);
  });
});

describe("Phase 9A full-payment policy", () => {
  it("collects one full payment only for an issued invoice with no completed payment", () => {
    const valid = { invoiceStatus: "ISSUED" as const, hasCompletedPayment: false, totalCents: 125050, paidCents: 0 };
    expect(canCollectFullPayment(valid)).toBe(true);
    expect(canCollectFullPayment({ ...valid, invoiceStatus: "DRAFT" })).toBe(false);
    expect(canCollectFullPayment({ ...valid, hasCompletedPayment: true })).toBe(false);
    expect(canCollectFullPayment({ ...valid, paidCents: 100 })).toBe(false);
    expect(canCollectFullPayment({ ...valid, totalCents: 0 })).toBe(false);
  });

  it("accepts only the three approved in-clinic methods", () => {
    expect(isSupportedPaymentMethod("CASH")).toBe(true);
    expect(isSupportedPaymentMethod("POS_CARD")).toBe(true);
    expect(isSupportedPaymentMethod("CLINIC_E_WALLET")).toBe(true);
    expect(isSupportedPaymentMethod("ONLINE_GATEWAY")).toBe(false);
    expect(isSupportedPaymentMethod("BANK_TRANSFER")).toBe(false);
    expect(paymentMethodRequiresReference("CASH")).toBe(false);
    expect(paymentMethodRequiresReference("POS_CARD")).toBe(true);
    expect(paymentMethodRequiresReference("CLINIC_E_WALLET")).toBe(true);
  });

  it("converts monetary values to integer cents without floating-point rounding", () => {
    expect(toCents("0.01")).toBe(1);
    expect(toCents("120.50")).toBe(12050);
    expect(toCents("120")).toBe(12000);
    expect(toCents("1.234")).toBeNull();
    expect(toCents("-1.00")).toBeNull();
    expect(toCents("1e3")).toBeNull();
  });
});
