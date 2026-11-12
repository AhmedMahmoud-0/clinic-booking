"use client";

import { useMemo, useState, type FormEvent } from "react";

type InvoiceItem = {
  id: string;
  description: string;
  sourceType: string;
  currencyCode: string;
  refundableAmount: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "VOIDED";
  currencyCode: string;
  items: InvoiceItem[];
};

export type CashierInvoiceAdjustmentsCopy = {
  discountTitle: string;
  discountAmount: string;
  discountReason: string;
  discountReasonPlaceholder: string;
  requestDiscount: string;
  discountRequestSuccess: string;
  refundTitle: string;
  refundReason: string;
  refundReasonPlaceholder: string;
  refundableItems: string;
  requestRefund: string;
  noRefundableItems: string;
  refundRequestSuccess: string;
  loading: string;
  genericError: string;
  requiredFields: string;
};

export type CashierInvoiceAdjustmentsWorkbenchProps = {
  invoice: Invoice;
  copy: CashierInvoiceAdjustmentsCopy;
  locale: string;
  onUpdated?: () => Promise<void> | void;
};

type ApiResult = { success?: boolean; error?: { message?: string } };

function money(value: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value));
  } catch {
    return `${value} ${currency}`;
  }
}

async function readResponse(response: Response, fallback: string): Promise<ApiResult> {
  const body = await response.json().catch(() => null) as ApiResult | null;
  if (!response.ok || !body?.success) throw new Error(body?.error?.message ?? fallback);
  return body;
}

export function CashierInvoiceAdjustmentsWorkbench({ invoice, copy, locale, onUpdated }: CashierInvoiceAdjustmentsWorkbenchProps) {
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const refundableItems = useMemo(() => invoice.items.filter((item) => Number(item.refundableAmount) > 0), [invoice.items]);

  const submitDiscount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!discountAmount.trim() || discountReason.trim().length < 3) {
      setError(copy.requiredFields);
      return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/cashier/invoices/${encodeURIComponent(invoice.id)}/discount-requests`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: discountAmount.trim(), reason: discountReason.trim() }),
      });
      await readResponse(response, copy.genericError);
      setDiscountAmount(""); setDiscountReason(""); setNotice(copy.discountRequestSuccess);
      await onUpdated?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.genericError);
    } finally {
      setBusy(false);
    }
  };

  const submitRefund = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedItemIds.length === 0 || refundReason.trim().length < 3) {
      setError(copy.requiredFields);
      return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/cashier/invoices/${encodeURIComponent(invoice.id)}/refund-requests`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: refundReason.trim(), items: selectedItemIds.map((invoiceItemId) => ({ invoiceItemId })) }),
      });
      await readResponse(response, copy.genericError);
      setRefundReason(""); setSelectedItemIds([]); setNotice(copy.refundRequestSuccess);
      await onUpdated?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.genericError);
    } finally {
      setBusy(false);
    }
  };

  const panel = "rounded-xl border border-slate-200 p-4";
  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
  const primary = "inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="space-y-4 border-t border-slate-200 pt-4">
      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {notice ? <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">{notice}</p> : null}
      {invoice.status === "DRAFT" ? (
        <form className={`${panel} grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end`} onSubmit={(event) => void submitDiscount(event)}>
          <div className="md:col-span-3"><h3 className="font-semibold">{copy.discountTitle}</h3></div>
          <label className="block"><span className="mb-1 block text-sm font-medium">{copy.discountAmount}</span><input className={field} inputMode="decimal" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium">{copy.discountReason}</span><input className={field} maxLength={500} value={discountReason} onChange={(event) => setDiscountReason(event.target.value)} placeholder={copy.discountReasonPlaceholder} /></label>
          <button type="submit" className={primary} disabled={busy}>{busy ? copy.loading : copy.requestDiscount}</button>
        </form>
      ) : null}

      {(invoice.status === "PAID" || invoice.status === "PARTIALLY_REFUNDED") ? (
        <form className={`${panel} space-y-3`} onSubmit={(event) => void submitRefund(event)}>
          <h3 className="font-semibold">{copy.refundTitle}</h3>
          {refundableItems.length === 0 ? <p className="text-sm text-slate-500">{copy.noRefundableItems}</p> : (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">{copy.refundableItems}</legend>
              {refundableItems.map((item) => (
                <label key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <input type="checkbox" checked={selectedItemIds.includes(item.id)} disabled={busy} onChange={(event) => setSelectedItemIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                    <span>{item.description}</span>
                  </span>
                  <span className="tabular-nums text-slate-600">{money(item.refundableAmount, item.currencyCode, locale)}</span>
                </label>
              ))}
            </fieldset>
          )}
          <label className="block"><span className="mb-1 block text-sm font-medium">{copy.refundReason}</span><textarea className={field} rows={2} maxLength={500} value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder={copy.refundReasonPlaceholder} /></label>
          <button type="submit" className={primary} disabled={busy || refundableItems.length === 0}>{busy ? copy.loading : copy.requestRefund}</button>
        </form>
      ) : null}
    </section>
  );
}
