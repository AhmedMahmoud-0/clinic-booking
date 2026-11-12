"use client";

import { useCallback, useEffect, useState } from "react";

type DiscountApproval = {
  id: string;
  amount: string;
  reason: string;
  requestedAt: string;
  requester: { employeeNumber: string; displayName: string };
  invoice: {
    id: string;
    invoiceNumber: string;
    patient: { mrn: string; displayName: string };
    subtotal: string;
    discountTotal: string;
    total: string;
    currencyCode: string;
  };
};

type RefundApproval = {
  id: string;
  reference: string;
  amount: string;
  currencyCode: string;
  reason: string;
  requestedAt: string;
  requester: { employeeNumber: string; displayName: string };
  invoice: { id: string; invoiceNumber: string; patient: { mrn: string; displayName: string } };
  items: Array<{ id: string; amount: string; reason: string; description: string; sourceType: string }>;
};

type Copy = {
  title: string;
  discountsTitle: string;
  refundsTitle: string;
  emptyDiscounts: string;
  emptyRefunds: string;
  invoice: string;
  patient: string;
  requester: string;
  requestedAt: string;
  reason: string;
  amount: string;
  subtotal: string;
  currentDiscount: string;
  total: string;
  approve: string;
  reject: string;
  rejectionReason: string;
  rejectionReasonPlaceholder: string;
  items: string;
  loading: string;
  refresh: string;
  genericError: string;
  requiredRejectionReason: string;
  approved: string;
  rejected: string;
};

export type ClinicManagerBillingApprovalsWorkbenchProps = { copy: Copy; locale: string };

type ListBody<T> = { success?: boolean; items?: T[]; error?: { message?: string } };
type DecisionBody = { success?: boolean; error?: { message?: string } };

function money(value: string, currency: string, locale: string): string {
  try { return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value)); }
  catch { return `${value} ${currency}`; }
}

function dateTime(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function ClinicManagerBillingApprovalsWorkbench({ copy, locale }: ClinicManagerBillingApprovalsWorkbenchProps) {
  const [discounts, setDiscounts] = useState<DiscountApproval[]>([]);
  const [refunds, setRefunds] = useState<RefundApproval[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [discountResponse, refundResponse] = await Promise.all([
      fetch("/api/clinic-manager/billing/discount-approvals", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/clinic-manager/billing/refund-approvals", { credentials: "same-origin", cache: "no-store" }),
    ]);
    const [discountBody, refundBody] = await Promise.all([
      discountResponse.json().catch(() => null) as Promise<ListBody<DiscountApproval> | null>,
      refundResponse.json().catch(() => null) as Promise<ListBody<RefundApproval> | null>,
    ]);
    if (!discountResponse.ok || !discountBody?.success || !refundResponse.ok || !refundBody?.success) {
      throw new Error(discountBody?.error?.message ?? refundBody?.error?.message ?? copy.genericError);
    }
    setDiscounts(discountBody.items ?? []);
    setRefunds(refundBody.items ?? []);
  }, [copy.genericError]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/clinic-manager/billing/discount-approvals", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/clinic-manager/billing/refund-approvals", { credentials: "same-origin", cache: "no-store" }),
    ]).then(async ([discountResponse, refundResponse]) => {
      const [discountBody, refundBody] = await Promise.all([
        discountResponse.json().catch(() => null) as Promise<ListBody<DiscountApproval> | null>,
        refundResponse.json().catch(() => null) as Promise<ListBody<RefundApproval> | null>,
      ]);
      if (!discountResponse.ok || !discountBody?.success || !refundResponse.ok || !refundBody?.success) {
        throw new Error(discountBody?.error?.message ?? refundBody?.error?.message ?? copy.genericError);
      }
      if (active) { setDiscounts(discountBody.items ?? []); setRefunds(refundBody.items ?? []); }
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : copy.genericError);
    });
    return () => { active = false; };
  }, [copy.genericError]);

  const decide = async (kind: "discount" | "refund", id: string, decision: "APPROVE" | "REJECT") => {
    const reason = rejectionReasons[id]?.trim() ?? "";
    if (decision === "REJECT" && reason.length < 3) {
      setError(copy.requiredRejectionReason);
      return;
    }
    setBusyId(id); setError(null); setNotice(null);
    const endpoint = kind === "discount"
      ? `/api/clinic-manager/billing/discount-approvals/${encodeURIComponent(id)}/decision`
      : `/api/clinic-manager/billing/refund-approvals/${encodeURIComponent(id)}/decision`;
    try {
      const response = await fetch(endpoint, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, ...(decision === "REJECT" ? { reason } : {}) }),
      });
      const body = await response.json().catch(() => null) as DecisionBody | null;
      if (!response.ok || !body?.success) throw new Error(body?.error?.message ?? copy.genericError);
      setRejectionReasons((current) => { const next = { ...current }; delete next[id]; return next; });
      setNotice(decision === "APPROVE" ? copy.approved : copy.rejected);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.genericError);
    } finally {
      setBusyId(null);
    }
  };

  const panel = "rounded-xl border border-slate-200 p-4";
  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  const primary = "inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50";
  const danger = "inline-flex items-center justify-center rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50";
  const secondary = "inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="space-y-5 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <button type="button" className={secondary} disabled={loading || busyId !== null} onClick={() => {
          setLoading(true); setError(null);
          void load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : copy.genericError)).finally(() => setLoading(false));
        }}>{loading ? copy.loading : copy.refresh}</button>
      </header>
      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {notice ? <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">{notice}</p> : null}

      <section className={`${panel} space-y-3`}>
        <h2 className="text-lg font-semibold">{copy.discountsTitle}</h2>
        {discounts.length === 0 ? <p className="text-sm text-slate-500">{copy.emptyDiscounts}</p> : discounts.map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold">{item.invoice.invoiceNumber}</h3><p className="text-sm">{copy.patient}: {item.invoice.patient.displayName} · {item.invoice.patient.mrn}</p><p className="text-sm text-slate-500">{copy.requester}: {item.requester.displayName} · {item.requester.employeeNumber}</p><p className="text-sm text-slate-500">{copy.requestedAt}: {dateTime(item.requestedAt, locale)}</p></div>
              <strong className="tabular-nums">{money(item.amount, item.invoice.currencyCode, locale)}</strong>
            </div>
            <p className="mt-2 text-sm">{copy.reason}: {item.reason}</p>
            <dl className="mt-2 grid max-w-md grid-cols-2 gap-2 text-sm"><dt className="text-slate-500">{copy.subtotal}</dt><dd className="text-end">{money(item.invoice.subtotal, item.invoice.currencyCode, locale)}</dd><dt className="text-slate-500">{copy.currentDiscount}</dt><dd className="text-end">{money(item.invoice.discountTotal, item.invoice.currencyCode, locale)}</dd><dt className="font-medium">{copy.total}</dt><dd className="text-end font-medium">{money(item.invoice.total, item.invoice.currencyCode, locale)}</dd></dl>
            <label className="mt-3 block"><span className="mb-1 block text-sm font-medium">{copy.rejectionReason}</span><input className={field} maxLength={500} value={rejectionReasons[item.id] ?? ""} onChange={(event) => setRejectionReasons((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={copy.rejectionReasonPlaceholder} /></label>
            <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" className={danger} disabled={busyId !== null} onClick={() => void decide("discount", item.id, "REJECT")}>{copy.reject}</button><button type="button" className={primary} disabled={busyId !== null} onClick={() => void decide("discount", item.id, "APPROVE")}>{busyId === item.id ? copy.loading : copy.approve}</button></div>
          </article>
        ))}
      </section>

      <section className={`${panel} space-y-3`}>
        <h2 className="text-lg font-semibold">{copy.refundsTitle}</h2>
        {refunds.length === 0 ? <p className="text-sm text-slate-500">{copy.emptyRefunds}</p> : refunds.map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold">{item.reference} · {item.invoice.invoiceNumber}</h3><p className="text-sm">{copy.patient}: {item.invoice.patient.displayName} · {item.invoice.patient.mrn}</p><p className="text-sm text-slate-500">{copy.requester}: {item.requester.displayName} · {item.requester.employeeNumber}</p><p className="text-sm text-slate-500">{copy.requestedAt}: {dateTime(item.requestedAt, locale)}</p></div>
              <strong className="tabular-nums">{money(item.amount, item.currencyCode, locale)}</strong>
            </div>
            <p className="mt-2 text-sm">{copy.reason}: {item.reason}</p>
            <div className="mt-2 space-y-1">{item.items.map((line) => <p key={line.id} className="text-sm text-slate-600">{line.description} · {money(line.amount, item.currencyCode, locale)} · {line.reason}</p>)}</div>
            <label className="mt-3 block"><span className="mb-1 block text-sm font-medium">{copy.rejectionReason}</span><input className={field} maxLength={500} value={rejectionReasons[item.id] ?? ""} onChange={(event) => setRejectionReasons((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={copy.rejectionReasonPlaceholder} /></label>
            <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" className={danger} disabled={busyId !== null} onClick={() => void decide("refund", item.id, "REJECT")}>{copy.reject}</button><button type="button" className={primary} disabled={busyId !== null} onClick={() => void decide("refund", item.id, "APPROVE")}>{busyId === item.id ? copy.loading : copy.approve}</button></div>
          </article>
        ))}
      </section>
    </main>
  );
}
