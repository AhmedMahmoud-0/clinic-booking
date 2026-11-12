"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CashierInvoiceAdjustmentsWorkbench, type CashierInvoiceAdjustmentsCopy } from "./cashier-invoice-adjustments-workbench";
import { CashierRefundExecutionWorkbench, type CashierRefundExecutionWorkbenchProps } from "./cashier-refund-execution-workbench";

type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "VOIDED";
type PaymentMethod = "CASH" | "POS_CARD" | "CLINIC_E_WALLET";

export type CashierBillingCopy = {
  title: string;
  subtitle: string;
  eligibleEncounters: string;
  invoiceWorklist: string;
  search: string;
  searchPlaceholder: string;
  refresh: string;
  createDraft: string;
  refreshDraft: string;
  open: string;
  noEligibleEncounters: string;
  noInvoices: string;
  invoiceNumber: string;
  patient: string;
  mrn: string;
  service: string;
  completedAt: string;
  status: string;
  amount: string;
  subtotal: string;
  discount: string;
  total: string;
  items: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  issueInvoice: string;
  collectPayment: string;
  paymentMethod: string;
  cash: string;
  posCard: string;
  eWallet: string;
  transactionReference: string;
  transactionReferencePlaceholder: string;
  paidAt: string;
  payments: string;
  receipt: string;
  printReceipt: string;
  invoiceDraft: string;
  issued: string;
  paid: string;
  partiallyRefunded: string;
  refunded: string;
  voided: string;
  loading: string;
  genericError: string;
  createSuccess: string;
  issueSuccess: string;
  paymentSuccess: string;
  requiredReference: string;
  close: string;
  walkInService: string;
  selectWalkInService: string;
  externalIntakes: string;
  noExternalIntakes: string;
  externalIntakeReference: string;
  releasedItems: string;
  createExternalDraft: string;
};

type Candidate = {
  encounterId: string;
  completedAt: string | null;
  patient: { mrn: string; displayName: string };
  appointment: { bookingReference: string; startsAt: string; serviceName: string } | null;
  isWalkIn: boolean;
  walkInServices: Array<{ doctorServiceId: string; serviceId: string; name: string; price: string; currencyCode: string }>;
};

type ExternalIntakeCandidate = {
  id: string;
  reference: string;
  createdAt: string;
  hasDraftInvoice: boolean;
  patient: { mrn: string; displayName: string };
  releasedItemCount: number;
  pendingItemCount: number;
};

type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  patient: { mrn: string; displayName: string };
  status: InvoiceStatus;
  subtotal: string;
  discountTotal: string;
  total: string;
  currencyCode: string;
  itemCount: number;
  completedPaymentCount: number;
  issuedAt: string | null;
  createdAt: string;
};

type InvoiceDetail = InvoiceListItem & {
  encounterId: string | null;
  externalLabIntakeId: string | null;
  items: Array<{
    id: string;
    sourceType: string;
    description: string;
    quantity: number;
    unitPrice: string;
    discountAmount: string;
    lineTotal: string;
    currencyCode: string;
    serviceCompletedAt: string;
    createdAt: string;
    refundableAmount: string;
  }>;
  payments: Array<{
    id: string;
    amount: string;
    currencyCode: string;
    method: PaymentMethod;
    transactionReference: string | null;
    paidAt: string;
  }>;
};

type Receipt = {
  paymentId: string;
  invoiceNumber: string;
  patient: { mrn: string; displayName: string };
  items: Array<{ description: string; quantity: number; unitPrice: string; discountAmount: string; lineTotal: string; currencyCode: string }>;
  subtotal: string;
  discountTotal: string;
  invoiceTotal: string;
  amountPaid: string;
  currencyCode: string;
  paymentMethod: PaymentMethod;
  transactionReference: string | null;
  paidAt: string;
};

type ApiPayload<T> = { success?: boolean; error?: { message?: string }; items?: T[]; invoice?: InvoiceDetail; receipt?: Receipt; payment?: { id: string } };

export type CashierInvoiceWorkbenchProps = {
  copy: CashierBillingCopy;
  locale: string;
  adjustmentsCopy?: CashierInvoiceAdjustmentsCopy;
  refundExecutionCopy?: CashierRefundExecutionWorkbenchProps["copy"];
};

function money(value: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value));
  } catch {
    return `${value} ${currency}`;
  }
}

function dateTime(value: string | null, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function paymentMethodLabel(method: PaymentMethod, copy: CashierBillingCopy): string {
  if (method === "CASH") return copy.cash;
  if (method === "POS_CARD") return copy.posCard;
  return copy.eWallet;
}

export function CashierInvoiceWorkbench({ copy, locale, adjustmentsCopy, refundExecutionCopy }: CashierInvoiceWorkbenchProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [externalIntakes, setExternalIntakes] = useState<ExternalIntakeCandidate[]>([]);
  const [walkInServiceByEncounter, setWalkInServiceByEncounter] = useState<Record<string, string>>({});
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [selected, setSelected] = useState<InvoiceDetail | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [transactionReference, setTransactionReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const statusLabel = useMemo<Record<InvoiceStatus, string>>(() => ({
    DRAFT: copy.invoiceDraft,
    ISSUED: copy.issued,
    PAID: copy.paid,
    PARTIALLY_REFUNDED: copy.partiallyRefunded,
    REFUNDED: copy.refunded,
    VOIDED: copy.voided,
  }), [copy]);

  const fetchLists = useCallback(async () => {
    const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    const [candidateResponse, externalResponse, invoiceResponse] = await Promise.all([
      fetch(`/api/cashier/invoices/eligible-encounters${query}`, { credentials: "same-origin", cache: "no-store" }),
      fetch(`/api/cashier/invoices/eligible-external-intakes${query}`, { credentials: "same-origin", cache: "no-store" }),
      fetch(`/api/cashier/invoices/worklist${query}`, { credentials: "same-origin", cache: "no-store" }),
    ]);
    const candidateBody = await candidateResponse.json() as ApiPayload<Candidate>;
    const externalBody = await externalResponse.json() as ApiPayload<ExternalIntakeCandidate>;
    const invoiceBody = await invoiceResponse.json() as ApiPayload<InvoiceListItem>;
    if (!candidateResponse.ok || !externalResponse.ok || !invoiceResponse.ok) {
      throw new Error(copy.genericError);
    }
    return {
      candidates: candidateBody.items ?? [],
      externalIntakes: externalBody.items ?? [],
      invoices: invoiceBody.items ?? [],
    };
  }, [copy.genericError, search]);

  const loadLists = useCallback(async () => {
    const lists = await fetchLists();
    setError(null);
    setCandidates(lists.candidates);
    setExternalIntakes(lists.externalIntakes);
    setInvoices(lists.invoices);
  }, [fetchLists]);

  const loadDetail = useCallback(async (invoiceId: string) => {
    setError(null);
    const response = await fetch(`/api/cashier/invoices/${encodeURIComponent(invoiceId)}`, { credentials: "same-origin", cache: "no-store" });
    const body = await response.json() as ApiPayload<never>;
    if (!response.ok || !body.invoice) throw new Error(copy.genericError);
    setSelected(body.invoice);
    setReceipt(null);
  }, [copy.genericError]);

  useEffect(() => {
    let active = true;
    void fetchLists().then((lists) => {
      if (!active) return;
      setCandidates(lists.candidates);
      setExternalIntakes(lists.externalIntakes);
      setInvoices(lists.invoices);
      setError(null);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : copy.genericError);
    });
    return () => { active = false; };
  }, [fetchLists, copy.genericError]);

  const runAction = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.genericError);
    } finally {
      setBusy(false);
    }
  }, [copy.genericError]);

  const createDraft = (encounterId: string, walkInDoctorServiceId?: string) => runAction(async () => {
    const response = await fetch("/api/cashier/invoices", {
      method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
      body: JSON.stringify({ encounterId, ...(walkInDoctorServiceId ? { walkInDoctorServiceId } : {}) }),
    });
    const body = await response.json() as ApiPayload<never>;
    if (!response.ok || !body.invoice) throw new Error(copy.genericError);
    setSelected(body.invoice);
    setReceipt(null);
    setNotice(copy.createSuccess);
    await loadLists();
  });

  const createExternalDraft = (externalLabIntakeId: string) => runAction(async () => {
    const response = await fetch("/api/cashier/invoices", {
      method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
      body: JSON.stringify({ externalLabIntakeId }),
    });
    const body = await response.json() as { invoice?: { id: string }; error?: { message?: string } };
    if (!response.ok || !body.invoice?.id) throw new Error(body.error?.message ?? copy.genericError);
    await loadDetail(body.invoice.id);
    setNotice(copy.createSuccess);
    await loadLists();
  });

  const refreshDraft = () => {
    if (!selected) return;
    void runAction(async () => {
      const draftSource = selected.externalLabIntakeId
        ? { externalLabIntakeId: selected.externalLabIntakeId }
        : selected.encounterId ? { encounterId: selected.encounterId } : null;
      if (!draftSource) throw new Error(copy.genericError);
      const response = await fetch("/api/cashier/invoices", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify(draftSource),
      });
      const body = await response.json() as ApiPayload<never>;
      if (!response.ok || !body.invoice) throw new Error(copy.genericError);
      setSelected(body.invoice);
      setNotice(copy.createSuccess);
      await loadLists();
    });
  };

  const issueInvoice = () => {
    if (!selected) return;
    void runAction(async () => {
      const response = await fetch(`/api/cashier/invoices/${encodeURIComponent(selected.id)}/issue`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}",
      });
      const body = await response.json() as ApiPayload<never>;
      if (!response.ok || !body.invoice) throw new Error(copy.genericError);
      setSelected(body.invoice);
      setNotice(copy.issueSuccess);
      await loadLists();
    });
  };

  const collectPayment = () => {
    if (!selected) return;
    if (method !== "CASH" && !transactionReference.trim()) {
      setError(copy.requiredReference);
      return;
    }
    void runAction(async () => {
      const response = await fetch(`/api/cashier/invoices/${encodeURIComponent(selected.id)}/payments`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, ...(method === "CASH" ? {} : { transactionReference: transactionReference.trim() }) }),
      });
      const body = await response.json() as ApiPayload<never>;
      if (!response.ok || !body.payment?.id) throw new Error(copy.genericError);
      const receiptResponse = await fetch(`/api/cashier/receipts/${encodeURIComponent(body.payment.id)}`, { credentials: "same-origin", cache: "no-store" });
      const receiptBody = await receiptResponse.json() as ApiPayload<never>;
      if (!receiptResponse.ok || !receiptBody.receipt) throw new Error(copy.genericError);
      setReceipt(receiptBody.receipt);
      await loadDetail(selected.id);
      setReceipt(receiptBody.receipt);
      setTransactionReference("");
      setNotice(copy.paymentSuccess);
      await loadLists();
    });
  };

  const openReceipt = (paymentId: string) => runAction(async () => {
    const response = await fetch(`/api/cashier/receipts/${encodeURIComponent(paymentId)}`, { credentials: "same-origin", cache: "no-store" });
    const body = await response.json() as ApiPayload<never>;
    if (!response.ok || !body.receipt) throw new Error(copy.genericError);
    setReceipt(body.receipt);
  });

  const panel = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
  const button = "inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50";
  const secondary = "inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="space-y-6 text-slate-900">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
        </div>
        <button type="button" className={secondary} disabled={busy} onClick={() => void runAction(loadLists)}>{copy.refresh}</button>
      </header>

      <label className="block max-w-xl">
        <span className="mb-1 block text-sm font-medium text-slate-700">{copy.search}</span>
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} />
      </label>

      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {notice ? <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">{notice}</p> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className={panel}>
          <h2 className="mb-3 text-lg font-semibold">{copy.eligibleEncounters}</h2>
          {candidates.length === 0 ? <p className="text-sm text-slate-500">{copy.noEligibleEncounters}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-start text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="py-2 pe-3">{copy.patient}</th><th className="py-2 pe-3">{copy.service}</th><th className="py-2 pe-3">{copy.completedAt}</th><th className="py-2">{copy.createDraft}</th></tr></thead>
                <tbody>{candidates.map((candidate) => <tr key={candidate.encounterId} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pe-3"><div className="font-medium">{candidate.patient.displayName}</div><div className="text-xs text-slate-500">{candidate.patient.mrn}</div></td>
                  <td className="py-3 pe-3">
                    {candidate.isWalkIn ? (
                      <label className="block min-w-48">
                        <span className="sr-only">{copy.walkInService}</span>
                        <select className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" value={walkInServiceByEncounter[candidate.encounterId] ?? ""} onChange={(event) => setWalkInServiceByEncounter((current) => ({ ...current, [candidate.encounterId]: event.target.value }))}>
                          <option value="">{copy.selectWalkInService}</option>
                          {candidate.walkInServices.map((service) => <option key={service.doctorServiceId} value={service.doctorServiceId}>{service.name} · {money(service.price, service.currencyCode, locale)}</option>)}
                        </select>
                      </label>
                    ) : candidate.appointment?.serviceName ?? "—"}
                  </td>
                  <td className="py-3 pe-3 whitespace-nowrap">{dateTime(candidate.completedAt, locale)}</td>
                  <td className="py-3"><button type="button" className={button} disabled={busy || (candidate.isWalkIn && !walkInServiceByEncounter[candidate.encounterId])} onClick={() => createDraft(candidate.encounterId, candidate.isWalkIn ? walkInServiceByEncounter[candidate.encounterId] : undefined)}>{copy.createDraft}</button></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className={panel}>
          <h2 className="mb-3 text-lg font-semibold">{copy.invoiceWorklist}</h2>
          {invoices.length === 0 ? <p className="text-sm text-slate-500">{copy.noInvoices}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-start text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="py-2 pe-3">{copy.invoiceNumber}</th><th className="py-2 pe-3">{copy.patient}</th><th className="py-2 pe-3">{copy.amount}</th><th className="py-2 pe-3">{copy.status}</th><th className="py-2">{copy.open}</th></tr></thead>
                <tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pe-3 font-medium">{invoice.invoiceNumber}</td>
                  <td className="py-3 pe-3"><div>{invoice.patient.displayName}</div><div className="text-xs text-slate-500">{invoice.patient.mrn}</div></td>
                  <td className="py-3 pe-3 whitespace-nowrap tabular-nums">{money(invoice.total, invoice.currencyCode, locale)}</td>
                  <td className="py-3 pe-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{statusLabel[invoice.status]}</span></td>
                  <td className="py-3"><button type="button" className={secondary} disabled={busy} onClick={() => void runAction(() => loadDetail(invoice.id))}>{copy.open}</button></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className={panel}>
        <h2 className="mb-3 text-lg font-semibold">{copy.externalIntakes}</h2>
        {externalIntakes.length === 0 ? <p className="text-sm text-slate-500">{copy.noExternalIntakes}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-start text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="py-2 pe-3">{copy.externalIntakeReference}</th><th className="py-2 pe-3">{copy.patient}</th><th className="py-2 pe-3">{copy.releasedItems}</th><th className="py-2 pe-3">{copy.completedAt}</th><th className="py-2">{copy.createExternalDraft}</th></tr></thead>
              <tbody>{externalIntakes.map((intake) => <tr key={intake.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3 pe-3 font-medium">{intake.reference}</td>
                <td className="py-3 pe-3"><div>{intake.patient.displayName}</div><div className="text-xs text-slate-500">{intake.patient.mrn}</div></td>
                <td className="py-3 pe-3 tabular-nums">{intake.releasedItemCount}</td>
                <td className="py-3 pe-3 whitespace-nowrap">{dateTime(intake.createdAt, locale)}</td>
                <td className="py-3"><button type="button" className={button} disabled={busy || intake.releasedItemCount === 0 || intake.pendingItemCount > 0} onClick={() => createExternalDraft(intake.id)}>{intake.hasDraftInvoice ? copy.refreshDraft : copy.createExternalDraft}</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      {refundExecutionCopy ? <CashierRefundExecutionWorkbench copy={refundExecutionCopy} locale={locale} onUpdated={async () => { await loadLists(); if (selected) await loadDetail(selected.id); }} /> : null}

      {selected ? <section className={`${panel} space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">{selected.invoiceNumber}</h2><p className="text-sm text-slate-500">{selected.patient.displayName} · {selected.patient.mrn}</p></div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800">{statusLabel[selected.status]}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-start text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="py-2 pe-3">{copy.items}</th><th className="py-2 pe-3">{copy.quantity}</th><th className="py-2 pe-3">{copy.unitPrice}</th><th className="py-2">{copy.lineTotal}</th></tr></thead>
            <tbody>{selected.items.map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="py-3 pe-3">{item.description}</td><td className="py-3 pe-3">{item.quantity}</td><td className="py-3 pe-3 tabular-nums">{money(item.unitPrice, item.currencyCode, locale)}</td><td className="py-3 tabular-nums">{money(item.lineTotal, item.currencyCode, locale)}</td></tr>)}</tbody>
          </table>
        </div>
        <dl className="ms-auto grid max-w-sm grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-slate-500">{copy.subtotal}</dt><dd className="text-end tabular-nums">{money(selected.subtotal, selected.currencyCode, locale)}</dd>
          <dt className="text-slate-500">{copy.discount}</dt><dd className="text-end tabular-nums">{money(selected.discountTotal, selected.currencyCode, locale)}</dd>
          <dt className="font-semibold">{copy.total}</dt><dd className="text-end font-semibold tabular-nums">{money(selected.total, selected.currencyCode, locale)}</dd>
        </dl>
        {selected.status === "DRAFT" ? <div className="flex flex-wrap gap-2"><button type="button" className={secondary} disabled={busy} onClick={refreshDraft}>{copy.refreshDraft}</button><button type="button" className={button} disabled={busy} onClick={issueInvoice}>{copy.issueInvoice}</button></div> : null}
        {selected.status === "ISSUED" ? <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <label className="min-w-52"><span className="mb-1 block text-sm font-medium">{copy.paymentMethod}</span><select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}><option value="CASH">{copy.cash}</option><option value="POS_CARD">{copy.posCard}</option><option value="CLINIC_E_WALLET">{copy.eWallet}</option></select></label>
          {method !== "CASH" ? <label className="min-w-60 flex-1"><span className="mb-1 block text-sm font-medium">{copy.transactionReference}</span><input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} placeholder={copy.transactionReferencePlaceholder} /></label> : null}
          <button type="button" className={button} disabled={busy} onClick={collectPayment}>{copy.collectPayment}</button>
        </div> : null}
        {selected.payments.length > 0 ? <div className="border-t border-slate-100 pt-4"><h3 className="mb-2 font-semibold">{copy.payments}</h3><div className="space-y-2">{selected.payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{money(payment.amount, payment.currencyCode, locale)} · {paymentMethodLabel(payment.method, copy)} · {dateTime(payment.paidAt, locale)}</span><button className={secondary} type="button" disabled={busy} onClick={() => void openReceipt(payment.id)}>{copy.receipt}</button></div>)}</div></div> : null}
        {adjustmentsCopy ? <CashierInvoiceAdjustmentsWorkbench key={selected.id} invoice={selected} copy={adjustmentsCopy} locale={locale} onUpdated={() => loadDetail(selected.id)} /> : null}
      </section> : null}

      {receipt ? <><style>{`@media print { body * { visibility: hidden !important; } #meruno-cashier-receipt, #meruno-cashier-receipt * { visibility: visible !important; } #meruno-cashier-receipt { position: absolute; inset: 0; width: 100%; border: 0 !important; box-shadow: none !important; } }`}</style><section id="meruno-cashier-receipt" className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><h2 className="text-lg font-semibold">{copy.receipt} · {receipt.invoiceNumber}</h2><button type="button" className={button} onClick={() => window.print()}>{copy.printReceipt}</button></div>
        <div className="mx-auto mt-4 max-w-2xl space-y-4">
          <div className="border-b border-slate-200 pb-3"><div className="text-xl font-semibold">{copy.receipt}</div><div className="mt-1 text-sm text-slate-500">{receipt.invoiceNumber} · {receipt.patient.displayName} · {receipt.patient.mrn}</div></div>
          <div className="overflow-x-auto"><table className="w-full text-start text-sm"><thead><tr className="border-b border-slate-200"><th className="py-2">{copy.items}</th><th className="py-2">{copy.quantity}</th><th className="py-2">{copy.lineTotal}</th></tr></thead><tbody>{receipt.items.map((item, index) => <tr key={`${item.description}-${index}`} className="border-b border-slate-100"><td className="py-2">{item.description}</td><td className="py-2">{item.quantity}</td><td className="py-2 tabular-nums">{money(item.lineTotal, item.currencyCode, locale)}</td></tr>)}</tbody></table></div>
          <div className="grid grid-cols-2 gap-2 text-sm"><span className="text-slate-500">{copy.subtotal}</span><strong className="text-end tabular-nums">{money(receipt.subtotal, receipt.currencyCode, locale)}</strong><span className="text-slate-500">{copy.discount}</span><strong className="text-end tabular-nums">{money(receipt.discountTotal, receipt.currencyCode, locale)}</strong><span className="text-slate-500">{copy.total}</span><strong className="text-end tabular-nums">{money(receipt.invoiceTotal, receipt.currencyCode, locale)}</strong><span className="text-slate-500">{copy.amount}</span><strong className="text-end tabular-nums">{money(receipt.amountPaid, receipt.currencyCode, locale)}</strong><span className="text-slate-500">{copy.paymentMethod}</span><strong className="text-end">{paymentMethodLabel(receipt.paymentMethod, copy)}</strong><span className="text-slate-500">{copy.paidAt}</span><strong className="text-end">{dateTime(receipt.paidAt, locale)}</strong></div>
          {receipt.transactionReference ? <p className="text-sm text-slate-500">{copy.transactionReference}: {receipt.transactionReference}</p> : null}
          <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">{receipt.paymentId}</p>
        </div>
      </section></> : null}
    </main>
  );
}
