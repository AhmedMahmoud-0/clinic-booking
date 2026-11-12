export type BillingInvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "VOIDED";

export type BillingPaymentMethod = "CASH" | "POS_CARD" | "CLINIC_E_WALLET";

export function canCreateInvoiceDraft(encounterStatus: string): boolean {
  return encounterStatus === "COMPLETED";
}

export function canIssueInvoice(input: {
  invoiceStatus: BillingInvoiceStatus;
  itemCount: number;
  hasPendingServices: boolean;
  totalCents: number;
}): boolean {
  return input.invoiceStatus === "DRAFT"
    && input.itemCount > 0
    && !input.hasPendingServices
    && input.totalCents > 0;
}

export function canCollectFullPayment(input: {
  invoiceStatus: BillingInvoiceStatus;
  hasCompletedPayment: boolean;
  totalCents: number;
  paidCents: number;
}): boolean {
  return input.invoiceStatus === "ISSUED"
    && !input.hasCompletedPayment
    && input.totalCents > 0
    && input.paidCents === 0;
}

export function isSupportedPaymentMethod(value: string): value is BillingPaymentMethod {
  return value === "CASH" || value === "POS_CARD" || value === "CLINIC_E_WALLET";
}

export function paymentMethodRequiresReference(method: BillingPaymentMethod): boolean {
  return method !== "CASH";
}

export function toCents(value: string | number): number | null {
  const normalized = String(value).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : null;
}
