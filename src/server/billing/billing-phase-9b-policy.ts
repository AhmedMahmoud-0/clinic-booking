export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "VOIDED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type RefundStatus = ApprovalStatus | "COMPLETED";

export function canRequestDiscount(input: {
  invoiceStatus: InvoiceStatus;
  hasPendingRequest: boolean;
  amountCents: number;
  remainingCents: number;
}): boolean {
  return input.invoiceStatus === "DRAFT"
    && !input.hasPendingRequest
    && Number.isSafeInteger(input.amountCents)
    && input.amountCents > 0
    && input.amountCents <= input.remainingCents;
}

export function canDecideApproval(input: {
  status: RefundStatus;
  requesterEmployeeId: string;
  decisionEmployeeId: string;
}): boolean {
  return input.status === "PENDING" && input.requesterEmployeeId !== input.decisionEmployeeId;
}

export function canRequestRefund(input: {
  invoiceStatus: InvoiceStatus;
  hasCompletedPayment: boolean;
  itemIsUnprovided: boolean;
  remainingRefundableCents: number;
}): boolean {
  return (input.invoiceStatus === "PAID" || input.invoiceStatus === "PARTIALLY_REFUNDED")
    && input.hasCompletedPayment
    && input.itemIsUnprovided
    && Number.isSafeInteger(input.remainingRefundableCents)
    && input.remainingRefundableCents > 0;
}

export function canCompleteRefund(input: {
  status: RefundStatus;
  originalPaymentExists: boolean;
  refundAmountCents: number;
  invoiceRemainingRefundableCents: number;
}): boolean {
  return input.status === "APPROVED"
    && input.originalPaymentExists
    && input.refundAmountCents > 0
    && input.refundAmountCents <= input.invoiceRemainingRefundableCents;
}

/**
 * Allocate invoice-level discount to line items in integer cents. The final
 * item absorbs rounding remainder so net line values sum exactly to invoice.total.
 */
export function allocateNetLineCents(
  items: Array<{ id: string; grossCents: number }>,
  subtotalCents: number,
  discountCents: number,
): Map<string, number> {
  const result = new Map<string, number>();
  if (subtotalCents <= 0 || discountCents < 0 || discountCents > subtotalCents) return result;
  const ordered = [...items].sort((a, b) => a.id.localeCompare(b.id));
  let allocatedDiscount = 0;
  ordered.forEach((item, index) => {
    const lineDiscount = index === ordered.length - 1
      ? discountCents - allocatedDiscount
      : Math.floor((discountCents * item.grossCents) / subtotalCents);
    allocatedDiscount += lineDiscount;
    result.set(item.id, item.grossCents - lineDiscount);
  });
  return result;
}

export function isUnprovidedSource(input: {
  sourceType: string;
  appointmentStatus?: string | null;
  labItemStatus?: string | null;
  labResultStatus?: string | null;
  radiologyItemStatus?: string | null;
}): boolean {
  if (input.sourceType === "SERVICE") return input.appointmentStatus === "CANCELLED";
  if (input.sourceType === "LAB_TEST") return input.labItemStatus === "CANCELLED" || input.labResultStatus === "CANCELLED";
  if (input.sourceType === "RADIOLOGY_PROCEDURE") return input.radiologyItemStatus === "CANCELLED";
  return false;
}

export function reportNetCollectedCents(collectedCents: number, refundedCents: number): number {
  return collectedCents - refundedCents;
}
