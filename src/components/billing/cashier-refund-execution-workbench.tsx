"use client";

import { useCallback, useEffect, useState } from "react";

type RefundExecutionItem = {
  id: string;
  reference: string;
  amount: string;
  currencyCode: string;
  reason: string;
  approvedAt: string | null;
  invoice: { id: string; invoiceNumber: string; patient: { mrn: string; displayName: string } };
  originalPaymentMethod: "CASH" | "POS_CARD" | "CLINIC_E_WALLET" | null;
  originalPaymentCount: number;
};

type Copy = {
  title: string;
  empty: string;
  invoice: string;
  patient: string;
  amount: string;
  reason: string;
  originalPaymentMethod: string;
  cash: string;
  posCard: string;
  eWallet: string;
  transactionReference: string;
  transactionReferencePlaceholder: string;
  complete: string;
  completed: string;
  refresh: string;
  loading: string;
  genericError: string;
  requiredReference: string;
  paymentSourceUnavailable: string;
};

export type CashierRefundExecutionWorkbenchProps = { copy: Copy; locale: string; onUpdated?: () => Promise<void> | void };

type ApiBody = { success?: boolean; items?: RefundExecutionItem[]; error?: { message?: string } };

function money(value: string, currency: string, locale: string): string {
  try { return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value)); }
  catch { return `${value} ${currency}`; }
}

function methodLabel(method: RefundExecutionItem["originalPaymentMethod"], copy: Copy): string {
  if (method === "CASH") return copy.cash;
  if (method === "POS_CARD") return copy.posCard;
  if (method === "CLINIC_E_WALLET") return copy.eWallet;
  return copy.paymentSourceUnavailable;
}

export function CashierRefundExecutionWorkbench({ copy, locale, onUpdated }: CashierRefundExecutionWorkbenchProps) {
  const [items, setItems] = useState<RefundExecutionItem[]>([]);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/cashier/refunds/worklist", { credentials: "same-origin", cache: "no-store" });
    const body = await response.json().catch(() => null) as ApiBody | null;
    if (!response.ok || !body?.success) throw new Error(body?.error?.message ?? copy.genericError);
    setItems(body.items ?? []);
  }, [copy.genericError]);

  useEffect(() => {
    let active = true;
    void fetch("/api/cashier/refunds/worklist", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as ApiBody | null;
        if (!response.ok || !body?.success) throw new Error(body?.error?.message ?? copy.genericError);
        if (active) setItems(body.items ?? []);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : copy.genericError);
      });
    return () => { active = false; };
  }, [copy.genericError]);

  const complete = async (item: RefundExecutionItem) => {
    if (item.originalPaymentCount !== 1 || !item.originalPaymentMethod) {
      setError(copy.paymentSourceUnavailable);
      return;
    }
    const transactionReference = references[item.id]?.trim() ?? "";
    if (item.originalPaymentMethod !== "CASH" && !transactionReference) {
      setError(copy.requiredReference);
      return;
    }
    setBusyId(item.id); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/cashier/refunds/${encodeURIComponent(item.id)}/complete`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify(item.originalPaymentMethod === "CASH" ? {} : { transactionReference }),
      });
      const body = await response.json().catch(() => null) as { success?: boolean; error?: { message?: string } } | null;
      if (!response.ok || !body?.success) throw new Error(body?.error?.message ?? copy.genericError);
      setNotice(copy.completed);
      setReferences((current) => { const next = { ...current }; delete next[item.id]; return next; });
      await load();
      await onUpdated?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.genericError);
    } finally {
      setBusyId(null);
    }
  };

  const panel = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
  const secondary = "inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
  const primary = "inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50";
  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    <section className={`${panel} space-y-4`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <button type="button" className={secondary} disabled={loading || busyId !== null} onClick={() => {
          setLoading(true); setError(null);
          void load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : copy.genericError)).finally(() => setLoading(false));
        }}>{loading ? copy.loading : copy.refresh}</button>
      </header>
      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {notice ? <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">{notice}</p> : null}
      {items.length === 0 ? <p className="text-sm text-slate-500">{copy.empty}</p> : (
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="font-semibold">{item.reference}</h3><p className="text-sm text-slate-500">{copy.invoice}: {item.invoice.invoiceNumber}</p><p className="text-sm">{copy.patient}: {item.invoice.patient.displayName} · {item.invoice.patient.mrn}</p></div>
                <strong className="tabular-nums">{money(item.amount, item.currencyCode, locale)}</strong>
              </div>
              <p className="mt-2 text-sm text-slate-600">{copy.reason}: {item.reason}</p>
              <p className="mt-2 text-sm">{copy.originalPaymentMethod}: {methodLabel(item.originalPaymentMethod, copy)}</p>
              {item.originalPaymentMethod && item.originalPaymentMethod !== "CASH" ? (
                <label className="mt-3 block"><span className="mb-1 block text-sm font-medium">{copy.transactionReference}</span><input className={field} maxLength={120} value={references[item.id] ?? ""} onChange={(event) => setReferences((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={copy.transactionReferencePlaceholder} /></label>
              ) : null}
              <div className="mt-3 flex justify-end"><button type="button" className={primary} disabled={busyId !== null || item.originalPaymentCount !== 1 || !item.originalPaymentMethod} onClick={() => void complete(item)}>{busyId === item.id ? copy.loading : copy.complete}</button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
