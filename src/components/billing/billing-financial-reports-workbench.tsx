"use client";

import { useCallback, useEffect, useState } from "react";

type Report = {
  period: { from: string; to: string; timeZone: string };
  currencyCode: string;
  summary: {
    invoiceCount: number;
    paidInvoiceCount: number;
    issuedUnpaidInvoiceCount: number;
    invoiceGross: string;
    approvedDiscounts: string;
    billedNet: string;
    collected: string;
    refunded: string;
    netCollected: string;
    outstandingIssued: string;
    paymentCount: number;
    refundCount: number;
    discountApprovalCount: number;
  };
  byPaymentMethod: Array<{ method: "CASH" | "POS_CARD" | "CLINIC_E_WALLET"; count: number; amount: string }>;
  daily: Array<{ date: string; collected: string; refunded: string; netCollected: string; paymentCount: number; refundCount: number }>;
};

type Copy = {
  title: string;
  subtitle: string;
  from: string;
  to: string;
  runReport: string;
  loading: string;
  genericError: string;
  invoiceCount: string;
  paidInvoiceCount: string;
  issuedUnpaidInvoiceCount: string;
  invoiceGross: string;
  approvedDiscounts: string;
  billedNet: string;
  collected: string;
  refunded: string;
  netCollected: string;
  outstandingIssued: string;
  paymentCount: string;
  refundCount: string;
  discountApprovalCount: string;
  paymentMethods: string;
  method: string;
  count: string;
  amount: string;
  dailyBreakdown: string;
  date: string;
  dailyCollected: string;
  dailyRefunded: string;
  dailyNetCollected: string;
  noRows: string;
  cash: string;
  posCard: string;
  eWallet: string;
};

export type BillingFinancialReportsWorkbenchProps = { copy: Copy; locale: string };

type ApiBody = { success?: boolean; report?: Report; error?: { message?: string } };

function cairoToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function money(value: string, currency: string, locale: string): string {
  try { return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value)); }
  catch { return `${value} ${currency}`; }
}

function methodLabel(method: Report["byPaymentMethod"][number]["method"], copy: Copy): string {
  if (method === "CASH") return copy.cash;
  if (method === "POS_CARD") return copy.posCard;
  return copy.eWallet;
}

export function BillingFinancialReportsWorkbench({ copy, locale }: BillingFinancialReportsWorkbenchProps) {
  const [today] = useState(cairoToday);
  const [from, setFrom] = useState(() => addDays(cairoToday(), -6));
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (start: string, end: string) => {
    const query = new URLSearchParams({ from: start, to: end });
    const response = await fetch(`/api/billing/reports/financial?${query.toString()}`, { credentials: "same-origin", cache: "no-store" });
    const body = await response.json().catch(() => null) as ApiBody | null;
    if (!response.ok || !body?.success || !body.report) throw new Error(body?.error?.message ?? copy.genericError);
    setReport(body.report);
  }, [copy.genericError]);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ from: addDays(cairoToday(), -6), to: cairoToday() });
    void fetch(`/api/billing/reports/financial?${query.toString()}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as ApiBody | null;
        if (!response.ok || !body?.success || !body.report) throw new Error(body?.error?.message ?? copy.genericError);
        if (active) setReport(body.report);
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : copy.genericError); });
    return () => { active = false; };
  }, [copy.genericError]);

  const submit = () => {
    setLoading(true); setError(null);
    void load(from, to).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : copy.genericError)).finally(() => setLoading(false));
  };

  const panel = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  const button = "inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50";
  const summaryItems: Array<[string, number | string]> = report ? [
    [copy.invoiceCount, report.summary.invoiceCount],
    [copy.paidInvoiceCount, report.summary.paidInvoiceCount],
    [copy.issuedUnpaidInvoiceCount, report.summary.issuedUnpaidInvoiceCount],
    [copy.invoiceGross, money(report.summary.invoiceGross, report.currencyCode, locale)],
    [copy.approvedDiscounts, money(report.summary.approvedDiscounts, report.currencyCode, locale)],
    [copy.billedNet, money(report.summary.billedNet, report.currencyCode, locale)],
    [copy.collected, money(report.summary.collected, report.currencyCode, locale)],
    [copy.refunded, money(report.summary.refunded, report.currencyCode, locale)],
    [copy.netCollected, money(report.summary.netCollected, report.currencyCode, locale)],
    [copy.outstandingIssued, money(report.summary.outstandingIssued, report.currencyCode, locale)],
    [copy.paymentCount, report.summary.paymentCount],
    [copy.refundCount, report.summary.refundCount],
    [copy.discountApprovalCount, report.summary.discountApprovalCount],
  ] : [];

  return (
    <main className="space-y-5 text-slate-900">
      <header><h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1><p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p></header>
      <section className={`${panel} flex flex-wrap items-end gap-3`}>
        <label className="min-w-44 flex-1"><span className="mb-1 block text-sm font-medium">{copy.from}</span><input className={field} type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="min-w-44 flex-1"><span className="mb-1 block text-sm font-medium">{copy.to}</span><input className={field} type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} /></label>
        <button type="button" className={button} disabled={loading || !from || !to || from > to || to > today} onClick={submit}>{loading ? copy.loading : copy.runReport}</button>
      </section>
      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {report ? <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map(([label, value]) => <article key={label} className={panel}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold tabular-nums">{value}</p></article>)}
        </section>
        <section className={`${panel} space-y-3`}>
          <h2 className="text-lg font-semibold">{copy.paymentMethods}</h2>
          {report.byPaymentMethod.length === 0 ? <p className="text-sm text-slate-500">{copy.noRows}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-start text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="py-2">{copy.method}</th><th className="py-2">{copy.count}</th><th className="py-2">{copy.amount}</th></tr></thead><tbody>{report.byPaymentMethod.map((row) => <tr key={row.method} className="border-b border-slate-100 last:border-0"><td className="py-3">{methodLabel(row.method, copy)}</td><td className="py-3 tabular-nums">{row.count}</td><td className="py-3 tabular-nums">{money(row.amount, report.currencyCode, locale)}</td></tr>)}</tbody></table></div>}
        </section>
        <section className={`${panel} space-y-3`}>
          <h2 className="text-lg font-semibold">{copy.dailyBreakdown}</h2>
          {report.daily.length === 0 ? <p className="text-sm text-slate-500">{copy.noRows}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[38rem] text-start text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="py-2">{copy.date}</th><th className="py-2">{copy.dailyCollected}</th><th className="py-2">{copy.dailyRefunded}</th><th className="py-2">{copy.dailyNetCollected}</th></tr></thead><tbody>{report.daily.map((row) => <tr key={row.date} className="border-b border-slate-100 last:border-0"><td className="py-3">{row.date}</td><td className="py-3 tabular-nums">{money(row.collected, report.currencyCode, locale)}</td><td className="py-3 tabular-nums">{money(row.refunded, report.currencyCode, locale)}</td><td className="py-3 tabular-nums">{money(row.netCollected, report.currencyCode, locale)}</td></tr>)}</tbody></table></div>}
        </section>
      </> : null}
    </main>
  );
}
