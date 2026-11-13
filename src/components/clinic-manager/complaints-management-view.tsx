"use client";

import { useCallback, useEffect, useState } from "react";

type ComplaintStatus = "RECEIVED" | "ACKNOWLEDGED" | "IN_REVIEW" | "RESOLVED" | "CLOSED" | "REJECTED";
type Complaint = {
  id: string; referenceNumber: string; channel: string; category: string; status: ComplaintStatus;
  subject: string; description: string;
  submitter: { name: string | null; phone: string | null; email: string | null } | null;
  receivedAt: string; acknowledgedAt: string | null;
  resolvedAt: string | null; closedAt: string | null;
  patientLinked: boolean;
  appointment: { reference: string; startsAt: string } | null;
  invoiceNumber: string | null;
  createdBy: { employeeNumber: string; displayName: string } | null;
  assignedTo: { employeeNumber: string; displayName: string } | null;
  events: Array<{ eventType: string; fromStatus: string | null; toStatus: string | null; note: string | null; occurredAt: string; actor: string | null }>;
};
type Payload = { success?: boolean; complaints?: { items: Complaint[]; total: number; statusCounts: Array<{ status: string; count: number }>; hasMore: boolean }; error?: { message?: string } };

const NEXT: Record<ComplaintStatus, ComplaintStatus[]> = {
  RECEIVED: ["ACKNOWLEDGED", "IN_REVIEW", "REJECTED"],
  ACKNOWLEDGED: ["IN_REVIEW", "RESOLVED", "REJECTED"],
  IN_REVIEW: ["RESOLVED", "REJECTED"],
  RESOLVED: ["IN_REVIEW", "CLOSED"],
  CLOSED: [], REJECTED: [],
};

function dateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value));
}

function label(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ComplaintsManagementView() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [counts, setCounts] = useState<Array<{ status: string; count: number }>>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (filter: string) => {
    const query = filter === "ALL" ? "" : `?status=${encodeURIComponent(filter)}`;
    const response = await fetch(`/api/clinic-manager/complaints${query}`, { credentials: "same-origin", cache: "no-store" });
    const body = await response.json().catch(() => null) as Payload | null;
    if (!response.ok || !body?.success || !body.complaints) throw new Error(body?.error?.message ?? "Complaints could not be loaded.");
    setItems(body.complaints.items); setCounts(body.complaints.statusCounts); setTotal(body.complaints.total); setHasMore(body.complaints.hasMore);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch(`/api/clinic-manager/complaints${statusFilter === "ALL" ? "" : `?status=${encodeURIComponent(statusFilter)}`}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as Payload | null;
        if (!response.ok || !body?.success || !body.complaints) throw new Error(body?.error?.message ?? "Complaints could not be loaded.");
        if (active) { setItems(body.complaints.items); setCounts(body.complaints.statusCounts); setTotal(body.complaints.total); setHasMore(body.complaints.hasMore); }
      }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Complaints could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [statusFilter]);

  const transition = async (item: Complaint, status: ComplaintStatus) => {
    const note = notes[item.id]?.trim() ?? "";
    if (["RESOLVED", "CLOSED", "REJECTED"].includes(status) && note.length < 3) {
      setError("Add a note of at least 3 characters for this decision."); return;
    }
    setBusyId(item.id); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/clinic-manager/complaints/${encodeURIComponent(item.id)}/transition`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, ...(note ? { note } : {}) }),
      });
      const body = await response.json().catch(() => null) as { success?: boolean; error?: { message?: string } } | null;
      if (!response.ok || !body?.success) throw new Error(body?.error?.message ?? "The complaint could not be updated.");
      setNotice(`${item.referenceNumber} updated to ${label(status)}.`);
      setNotes((current) => ({ ...current, [item.id]: "" }));
      await load(statusFilter);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The complaint could not be updated."); }
    finally { setBusyId(null); }
  };

  const panel = "rounded-2xl border border-[#E3ECE8] bg-white p-5 shadow-sm";
  const field = "min-h-10 w-full rounded-xl border border-[#D7E3DE] bg-white px-3 py-2 text-sm text-[#2D4742] outline-none focus:border-[#5C9B8B] focus:ring-2 focus:ring-[#D9EFEB]";
  const button = "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white hover:bg-[#125B57] disabled:cursor-not-allowed disabled:opacity-50";

  return <div className="space-y-6 text-[#243B3B]">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Patient experience</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Complaints</h1><p className="mt-2 text-sm leading-6 text-[#74857F]">Review complaints, maintain a traceable status history, and record the manager&apos;s response.</p><p className="mt-2 text-xs leading-5 text-[#87958F]">Operational service targets are acknowledgement within 1 business day and closure within 5 business days. These are management targets, not guaranteed deadlines.</p></div><button type="button" className={button} disabled={loading || busyId !== null} onClick={() => { setLoading(true); void load(statusFilter).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Complaints could not be loaded.")).finally(() => setLoading(false)); }}>Refresh</button></header>
    {error ? <p role="alert" className="rounded-xl border border-[#F0D7CF] bg-[#FFF8F5] p-3 text-sm text-[#9C5543]">{error}</p> : null}
    {notice ? <p role="status" className="rounded-xl border border-[#D2E9DF] bg-[#EDF7F2] p-3 text-sm text-[#315F50]">{notice}</p> : null}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className={panel}><p className="text-sm text-[#74857F]">All complaints</p><p className="mt-2 text-3xl font-semibold tabular-nums">{total}</p></article>{counts.slice(0, 3).map((entry) => <article className={panel} key={entry.status}><p className="text-sm text-[#74857F]">{label(entry.status)}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{entry.count}</p></article>)}</section>
    <section className={`${panel} space-y-4`}>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Complaint queue</h2><p className="mt-1 text-sm text-[#74857F]">Oldest received items are listed first.</p></div><label className="w-full max-w-xs"><span className="mb-1 block text-xs font-semibold text-[#60776F]">Filter by status</span><select className={field} value={statusFilter} onChange={(event) => { setLoading(true); setStatusFilter(event.target.value); }}><option value="ALL">All statuses</option>{["RECEIVED", "ACKNOWLEDGED", "IN_REVIEW", "RESOLVED", "CLOSED", "REJECTED"].map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label></div>
      {loading ? <p className="py-8 text-center text-sm text-[#74857F]">Loading complaints…</p> : items.length === 0 ? <div className="rounded-xl border border-dashed border-[#D7E3DE] p-8 text-center"><p className="font-semibold">No complaints in this view</p><p className="mt-1 text-sm text-[#74857F]">New submissions will appear here when received.</p></div> : <div className="space-y-4">{items.map((item) => <article key={item.id} className="rounded-xl border border-[#E4ECE8] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#78908A]">{item.referenceNumber} · {label(item.channel)} · {label(item.category)}</p><h3 className="mt-1 text-lg font-semibold">{item.subject}</h3><p className="mt-1 text-sm text-[#74857F]">Received {dateTime(item.receivedAt)}</p></div><span className="rounded-full bg-[#EAF4F1] px-3 py-1.5 text-xs font-semibold text-[#176B67]">{label(item.status)}</span></div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4E645D]">{item.description}</p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[#87958F]">Patient reference</dt><dd>{item.patientLinked ? "A patient record is linked" : "No patient record linked"}</dd></div><div><dt className="text-xs text-[#87958F]">Source</dt><dd>{item.createdBy ? `${item.createdBy.displayName} · ${item.createdBy.employeeNumber}` : label(item.channel)}</dd></div>{item.appointment ? <div><dt className="text-xs text-[#87958F]">Appointment reference</dt><dd>{item.appointment.reference}</dd></div> : null}{item.invoiceNumber ? <div><dt className="text-xs text-[#87958F]">Invoice</dt><dd>{item.invoiceNumber}</dd></div> : null}{item.submitter ? <div className="sm:col-span-2"><dt className="text-xs text-[#87958F]">Submitter contact</dt><dd>{[item.submitter.name, item.submitter.phone, item.submitter.email].filter(Boolean).join(" · ") || "No contact details provided"}</dd></div> : null}</dl>
        {item.events.length ? <details className="mt-4 rounded-lg bg-[#F7FAF8] p-3"><summary className="cursor-pointer text-sm font-semibold text-[#46645B]">Status history ({item.events.length})</summary><ol className="mt-3 space-y-2">{item.events.map((event, index) => <li key={`${event.occurredAt}-${index}`} className="border-s border-[#C7DCD3] ps-3 text-sm"><p className="font-medium">{label(event.eventType)}{event.toStatus ? ` · ${label(event.toStatus)}` : ""}</p><p className="text-xs text-[#87958F]">{dateTime(event.occurredAt)}{event.actor ? ` · ${event.actor}` : ""}</p>{event.note ? <p className="mt-1 whitespace-pre-wrap text-[#60776F]">{event.note}</p> : null}</li>)}</ol></details> : null}
        {NEXT[item.status].length ? <div className="mt-4 grid gap-3 rounded-xl bg-[#F7FAF8] p-3 md:grid-cols-[minmax(0,1fr)_auto]"><label><span className="mb-1 block text-xs font-semibold text-[#60776F]">Manager note {"(required for resolution, closure or rejection)"}</span><textarea className={field} rows={2} maxLength={1000} value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} /></label><div className="flex flex-wrap items-end gap-2">{NEXT[item.status].map((status) => <button key={status} type="button" className={button} disabled={busyId !== null} onClick={() => void transition(item, status)}>{busyId === item.id ? "Saving…" : label(status)}</button>)}</div></div> : <p className="mt-4 text-xs text-[#87958F]">This complaint is in a terminal status.</p>}
      </article>)}</div>}
      {hasMore ? <p className="text-xs text-[#87958F]">Showing the first 100 records. Narrow the status filter to review a smaller queue.</p> : null}
    </section>
  </div>;
}
