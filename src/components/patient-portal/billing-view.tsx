"use client";

import { useEffect, useState } from "react";
import { formatPortalDate, formatPortalDateTime, humanizePortalValue } from "./portal-format";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: string;
  discountTotal: string;
  total: string;
  currencyCode: string;
  issuedAt: string | null;
  items: Array<{ description: string; quantity: number; unitPrice: string; discountAmount: string; lineTotal: string; currencyCode: string }>;
  payments: Array<{ id: string; amount: string; currencyCode: string; method: string; transactionReference: string | null; paidAt: string }>;
  refunds: Array<{ reference: string; amount: string; currencyCode: string; status: string; requestedAt: string; completedAt: string | null }>;
};

function formatMoney(value: string, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`;
  try {
    return new Intl.NumberFormat("en-EG", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

type ReceiptSelection = { invoice: Invoice; payment: Invoice["payments"][number] };

export function BillingView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptSelection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/patient/portal/billing", { cache: "no-store" });
        const payload = await response.json() as { invoices?: Invoice[]; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message || "Your invoices could not be loaded.");
        if (active) setInvoices(Array.isArray(payload.invoices) ? payload.invoices : []);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Your invoices could not be loaded.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Payments and receipts</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">Invoices & receipts</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#74857F]">View invoices issued by the clinic, completed payments, and recorded refund updates. Online payment and refund actions are not available in this portal.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="min-h-10 rounded-xl border border-[#C9DDD6] bg-white px-4 text-sm font-semibold text-[#176B67] hover:bg-[#F0F7F4] print:hidden">Print billing statement</button>
      </header>
      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}
      {isLoading ? <div className="h-32 animate-pulse rounded-2xl bg-white" aria-label="Loading invoices" /> : null}
      {!isLoading && !errorMessage && invoices.length === 0 ? <section className="rounded-2xl border border-[#E3ECE8] bg-white p-8"><h2 className="font-semibold text-[#334D47]">No issued invoices</h2><p className="mt-2 text-sm text-[#7B8B85]">Invoices will appear here after they have been issued by the clinic.</p></section> : null}
      <div className="grid gap-4">
        {invoices.map((invoice) => (
          <article key={invoice.id} className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-6 print:break-inside-avoid">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-[#81968D]">Invoice</p><h2 className="mt-1 text-lg font-semibold text-[#2D4742]">{invoice.invoiceNumber}</h2><p className="mt-1 text-xs text-[#7B8B85]">Issued {formatPortalDate(invoice.issuedAt)}</p></div>
              <span className="rounded-full bg-[#EDF6F2] px-3 py-1 text-xs font-semibold text-[#34765E]">{humanizePortalValue(invoice.status)}</span>
            </div>
            <div className="mt-5 overflow-x-auto rounded-xl border border-[#E8EFEC]">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-[#F5F8F7] text-xs text-[#647A72]"><tr><th className="px-3 py-2">Description</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Unit price</th><th className="px-3 py-2">Discount</th><th className="px-3 py-2">Line total</th></tr></thead>
                <tbody className="divide-y divide-[#EEF2F0]">{invoice.items.map((item, index) => <tr key={`${invoice.id}-${index}`}><td className="px-3 py-2 text-[#405B53]">{item.description}</td><td className="px-3 py-2 text-[#526A62]">{item.quantity}</td><td className="px-3 py-2 text-[#526A62]">{formatMoney(item.unitPrice, item.currencyCode)}</td><td className="px-3 py-2 text-[#526A62]">{formatMoney(item.discountAmount, item.currencyCode)}</td><td className="px-3 py-2 font-medium text-[#405B53]">{formatMoney(item.lineTotal, item.currencyCode)}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="mt-4 ml-auto grid max-w-sm grid-cols-2 gap-y-2 text-sm"><span className="text-[#71857D]">Subtotal</span><span className="text-right text-[#526A62]">{formatMoney(invoice.subtotal, invoice.currencyCode)}</span><span className="text-[#71857D]">Discount</span><span className="text-right text-[#526A62]">{formatMoney(invoice.discountTotal, invoice.currencyCode)}</span><span className="border-t border-[#E8EFEC] pt-2 font-semibold text-[#334D47]">Invoice total</span><span className="border-t border-[#E8EFEC] pt-2 text-right font-semibold text-[#334D47]">{formatMoney(invoice.total, invoice.currencyCode)}</span></div>
            <div className="mt-5 border-t border-[#EEF2F0] pt-4">
              <h3 className="font-semibold text-[#405B53]">Payment receipts</h3>
              {invoice.payments.length === 0 ? <p className="mt-2 text-sm text-[#7B8B85]">No completed payment is recorded for this invoice.</p> : <div className="mt-3 grid gap-3">{invoice.payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F5F8F7] p-3"><div><p className="font-semibold text-[#31534B]">{formatMoney(payment.amount, payment.currencyCode)} · {humanizePortalValue(payment.method)}</p><p className="mt-1 text-xs text-[#778B83]">Paid {formatPortalDateTime(payment.paidAt)}{payment.transactionReference ? ` · Ref ${payment.transactionReference}` : ""}</p></div><button type="button" onClick={() => setActiveReceipt({ invoice, payment })} className="min-h-9 rounded-lg border border-[#C9DDD6] bg-white px-3 text-xs font-semibold text-[#176B67] hover:bg-[#F0F7F4] print:hidden">View receipt</button></div>)}</div>}
            </div>
            {invoice.refunds.length > 0 ? <div className="mt-4 border-t border-[#EEF2F0] pt-4"><h3 className="font-semibold text-[#405B53]">Refund history</h3><div className="mt-2 grid gap-2">{invoice.refunds.map((refund) => <div key={refund.reference} className="flex flex-wrap justify-between gap-2 text-sm"><span className="text-[#657A72]">{refund.reference} · {humanizePortalValue(refund.status)}</span><span className="text-[#526A62]">{formatMoney(refund.amount, refund.currencyCode)} · {formatPortalDate(refund.completedAt || refund.requestedAt)}</span></div>)}</div></div> : null}
          </article>
        ))}
      </div>
      {activeReceipt ? (
        <div data-printable-receipt="true" role="dialog" aria-modal="true" aria-label="Payment receipt" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#1B3330]/45 p-4">
          <style>{`@media print { body * { visibility: hidden !important; } [data-printable-receipt="true"], [data-printable-receipt="true"] * { visibility: visible !important; } [data-printable-receipt="true"] { position: absolute !important; inset: 0 !important; display: block !important; width: 100% !important; min-height: 100vh !important; padding: 0 !important; background: white !important; } [data-receipt-modal-actions] { display: none !important; } }`}</style>
          <section className="w-full max-w-2xl rounded-2xl border border-[#E3ECE8] bg-white p-6 shadow-2xl print:max-w-none print:border-0 print:p-8 print:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E8EFEC] pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">MERUNO · Payment receipt</p><h2 className="mt-2 text-2xl font-semibold text-[#243B3B]">{activeReceipt.invoice.invoiceNumber}</h2><p className="mt-1 text-sm text-[#71857D]">Paid {formatPortalDateTime(activeReceipt.payment.paidAt)}</p></div>
              <span className="rounded-full bg-[#E9F5EF] px-3 py-1 text-xs font-semibold text-[#34765E]">Completed</span>
            </div>
            <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-[#7A8B84]">Payment method:</span> <span className="font-medium text-[#405B53]">{humanizePortalValue(activeReceipt.payment.method)}</span></p>{activeReceipt.payment.transactionReference ? <p><span className="text-[#7A8B84]">Transaction reference:</span> <span className="font-medium text-[#405B53]">{activeReceipt.payment.transactionReference}</span></p> : null}</div>
            <div className="mt-5 overflow-x-auto rounded-xl border border-[#E8EFEC]"><table className="w-full min-w-[420px] text-left text-sm"><thead className="bg-[#F5F8F7] text-xs text-[#647A72]"><tr><th className="px-3 py-2">Description</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Amount</th></tr></thead><tbody className="divide-y divide-[#EEF2F0]">{activeReceipt.invoice.items.map((item, index) => <tr key={`${activeReceipt.invoice.id}-receipt-${index}`}><td className="px-3 py-2 text-[#405B53]">{item.description}</td><td className="px-3 py-2 text-[#526A62]">{item.quantity}</td><td className="px-3 py-2 text-[#526A62]">{formatMoney(item.lineTotal, item.currencyCode)}</td></tr>)}</tbody></table></div>
            <div className="mt-5 ml-auto grid max-w-sm grid-cols-2 gap-y-2 text-sm"><span className="text-[#71857D]">Invoice total</span><span className="text-right text-[#526A62]">{formatMoney(activeReceipt.invoice.total, activeReceipt.invoice.currencyCode)}</span><span className="border-t border-[#E8EFEC] pt-2 font-semibold text-[#334D47]">Amount paid</span><span className="border-t border-[#E8EFEC] pt-2 text-right font-semibold text-[#334D47]">{formatMoney(activeReceipt.payment.amount, activeReceipt.payment.currencyCode)}</span></div>
            <div data-receipt-modal-actions="true" className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#EEF2F0] pt-4 print:hidden"><button type="button" onClick={() => setActiveReceipt(null)} className="min-h-10 rounded-xl border border-[#DCE7E3] px-4 text-sm font-semibold text-[#536963]">Close</button><button type="button" onClick={() => window.print()} className="min-h-10 rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white">Print receipt</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
