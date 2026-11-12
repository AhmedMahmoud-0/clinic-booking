import { describe, expect, it } from "vitest";
import {
  allocateNetLineCents,
  canCompleteRefund,
  canDecideApproval,
  canRequestDiscount,
  canRequestRefund,
  isUnprovidedSource,
  reportNetCollectedCents,
} from "../../src/server/billing/billing-phase-9b-policy";

describe("Phase 9B discount policy", () => {
  it("allows only positive discounts within the remaining draft balance", () => {
    const valid = { invoiceStatus: "DRAFT" as const, hasPendingRequest: false, amountCents: 2500, remainingCents: 10000 };
    expect(canRequestDiscount(valid)).toBe(true);
    expect(canRequestDiscount({ ...valid, invoiceStatus: "ISSUED" })).toBe(false);
    expect(canRequestDiscount({ ...valid, hasPendingRequest: true })).toBe(false);
    expect(canRequestDiscount({ ...valid, amountCents: 0 })).toBe(false);
    expect(canRequestDiscount({ ...valid, amountCents: 10001 })).toBe(false);
    expect(canRequestDiscount({ ...valid, amountCents: 1.5 })).toBe(false);
  });

  it("blocks a requester from deciding their own approval", () => {
    expect(canDecideApproval({ status: "PENDING", requesterEmployeeId: "cashier-1", decisionEmployeeId: "manager-1" })).toBe(true);
    expect(canDecideApproval({ status: "PENDING", requesterEmployeeId: "same", decisionEmployeeId: "same" })).toBe(false);
    expect(canDecideApproval({ status: "APPROVED", requesterEmployeeId: "cashier-1", decisionEmployeeId: "manager-1" })).toBe(false);
    expect(canDecideApproval({ status: "COMPLETED", requesterEmployeeId: "cashier-1", decisionEmployeeId: "manager-1" })).toBe(false);
  });

  it("allocates an invoice-level discount in integer cents with an exact final remainder", () => {
    const allocation = allocateNetLineCents([
      { id: "line-b", grossCents: 6667 },
      { id: "line-a", grossCents: 3333 },
    ], 10000, 1001);
    expect(allocation.get("line-a")).toBe(3000);
    expect(allocation.get("line-b")).toBe(5999);
    expect([...allocation.values()].reduce((sum, value) => sum + value, 0)).toBe(8999);
  });
});

describe("Phase 9B refund policy", () => {
  it("allows only paid invoices with one completed payment and unprovided items", () => {
    const valid = { invoiceStatus: "PAID" as const, hasCompletedPayment: true, itemIsUnprovided: true, remainingRefundableCents: 12500 };
    expect(canRequestRefund(valid)).toBe(true);
    expect(canRequestRefund({ ...valid, invoiceStatus: "ISSUED" })).toBe(false);
    expect(canRequestRefund({ ...valid, hasCompletedPayment: false })).toBe(false);
    expect(canRequestRefund({ ...valid, itemIsUnprovided: false })).toBe(false);
    expect(canRequestRefund({ ...valid, remainingRefundableCents: 0 })).toBe(false);
    expect(canRequestRefund({ ...valid, remainingRefundableCents: 10.5 })).toBe(false);
  });

  it("recognizes only explicitly cancelled source records as unprovided", () => {
    expect(isUnprovidedSource({ sourceType: "SERVICE", appointmentStatus: "CANCELLED" })).toBe(true);
    expect(isUnprovidedSource({ sourceType: "SERVICE", appointmentStatus: "COMPLETED" })).toBe(false);
    expect(isUnprovidedSource({ sourceType: "LAB_TEST", labItemStatus: "CANCELLED" })).toBe(true);
    expect(isUnprovidedSource({ sourceType: "LAB_TEST", labResultStatus: "CANCELLED" })).toBe(true);
    expect(isUnprovidedSource({ sourceType: "RADIOLOGY_PROCEDURE", radiologyItemStatus: "CANCELLED" })).toBe(true);
    expect(isUnprovidedSource({ sourceType: "OTHER" })).toBe(false);
  });

  it("completes only approved refunds within the remaining invoice balance", () => {
    const valid = { status: "APPROVED" as const, originalPaymentExists: true, refundAmountCents: 2500, invoiceRemainingRefundableCents: 5000 };
    expect(canCompleteRefund(valid)).toBe(true);
    expect(canCompleteRefund({ ...valid, status: "PENDING" })).toBe(false);
    expect(canCompleteRefund({ ...valid, originalPaymentExists: false })).toBe(false);
    expect(canCompleteRefund({ ...valid, refundAmountCents: 5001 })).toBe(false);
  });

  it("preserves negative net collections when refunds exceed period receipts", () => {
    expect(reportNetCollectedCents(15000, 5000)).toBe(10000);
    expect(reportNetCollectedCents(5000, 7000)).toBe(-2000);
  });
});
