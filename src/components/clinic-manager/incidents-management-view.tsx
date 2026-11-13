"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type IncidentStatus = "REPORTED" | "UNDER_REVIEW" | "ACTION_REQUIRED" | "RESOLVED" | "CLOSED";
type Incident = {
  id: string; referenceNumber: string; category: string; severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  status: IncidentStatus; occurredAt: string; reportedAt: string; summary: string; description: string;
  immediateActions: string | null; resolutionNotes: string | null; resolvedAt: string | null; closedAt: string | null;
  reportedBy: { employeeNumber: string; displayName: string }; assignedTo: { employeeNumber: string; displayName: string } | null;
  events: Array<{ id: string; action: string; reason: string | null; occurredAt: string; actor: string | null; actorEmployeeNumber: string | null }>;
};
type Payload = { success?: boolean; incidents?: { items: Incident[]; statusCounts: Array<{ status: string; count: number }>; openSeverityCounts: Array<{ severity: string; count: number }> }; error?: { message?: string } };
const NEXT: Record<IncidentStatus, IncidentStatus[]> = { REPORTED: ["UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED"], UNDER_REVIEW: ["ACTION_REQUIRED", "RESOLVED"], ACTION_REQUIRED: ["UNDER_REVIEW", "RESOLVED"], RESOLVED: ["CLOSED", "UNDER_REVIEW"], CLOSED: [] };
const CATEGORIES = ["OPERATIONAL", "PATIENT_SAFETY", "FACILITY", "PRIVACY", "SECURITY", "CLINICAL", "OTHER"];
const SEVERITIES = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
function label(value: string): string { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function dateTime(value: string): string { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value)); }
function severityClass(value: string): string { return value === "CRITICAL" || value === "HIGH" ? "bg-[#FFF0ED] text-[#A14B3D]" : value === "MODERATE" ? "bg-[#FFF5E7] text-[#93621C]" : "bg-[#EAF4F1] text-[#176B67]"; }

export function IncidentsManagementView() {
  const [items, setItems] = useState<Incident[]>([]);
  const [statusCounts, setStatusCounts] = useState<Array<{ status: string; count: number }>>([]);
  const [severityCounts, setSeverityCounts] = useState<Array<{ severity: string; count: number }>>([]);
  const [category, setCategory] = useState("OPERATIONAL");
  const [severity, setSeverity] = useState("LOW");
  const [occurredAt, setOccurredAt] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [immediateActions, setImmediateActions] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/clinic-manager/incidents", { credentials: "same-origin", cache: "no-store" });
    const body = await response.json().catch(() => null) as Payload | null;
    if (!response.ok || !body?.success || !body.incidents) throw new Error(body?.error?.message ?? "Incident reports could not be loaded.");
    setItems(body.incidents.items); setStatusCounts(body.incidents.statusCounts); setSeverityCounts(body.incidents.openSeverityCounts);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/clinic-manager/incidents", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => { const body = await response.json().catch(() => null) as Payload | null; if (!response.ok || !body?.success || !body.incidents) throw new Error(body?.error?.message ?? "Incident reports could not be loaded."); if (active) { setItems(body.incidents.items); setStatusCounts(body.incidents.statusCounts); setSeverityCounts(body.incidents.openSeverityCounts); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Incident reports could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/clinic-manager/incidents", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, severity, occurredAt: new Date(occurredAt).toISOString(), summary, description, ...(immediateActions.trim() ? { immediateActions: immediateActions.trim() } : {}) }),
      });
      const body = await response.json().catch(() => null) as { success?: boolean; incident?: { referenceNumber?: string }; error?: { message?: string } } | null;
      if (!response.ok || !body?.success || !body.incident) throw new Error(body?.error?.message ?? "The incident could not be recorded.");
      setNotice(`Incident ${body.incident.referenceNumber} was recorded.`); setSummary(""); setDescription(""); setImmediateActions(""); setOccurredAt("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The incident could not be recorded."); }
    finally { setSubmitting(false); }
  };

  const transition = async (item: Incident, status: IncidentStatus) => {
    const note = notes[item.id]?.trim() ?? "";
    if (["RESOLVED", "CLOSED"].includes(status) && note.length < 3) { setError("Resolution notes of at least 3 characters are required."); return; }
    setBusyId(item.id); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/clinic-manager/incidents/${encodeURIComponent(item.id)}/transition`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, ...(note ? { note } : {}) }) });
      const body = await response.json().catch(() => null) as { success?: boolean; error?: { message?: string } } | null;
      if (!response.ok || !body?.success) throw new Error(body?.error?.message ?? "The incident could not be updated.");
      setNotice(`${item.referenceNumber} updated to ${label(status)}.`); setNotes((current) => ({ ...current, [item.id]: "" })); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The incident could not be updated."); }
    finally { setBusyId(null); }
  };

  const panel = "rounded-2xl border border-[#E3ECE8] bg-white p-5 shadow-sm";
  const field = "min-h-10 w-full rounded-xl border border-[#D7E3DE] bg-white px-3 py-2 text-sm text-[#2D4742] outline-none focus:border-[#5C9B8B] focus:ring-2 focus:ring-[#D9EFEB]";
  const primary = "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white hover:bg-[#125B57] disabled:cursor-not-allowed disabled:opacity-50";

  return <div className="space-y-6 text-[#243B3B]">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Confidential operational reporting</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Incident reports</h1><p className="mt-2 text-sm leading-6 text-[#74857F]">Record operational or safety incidents and track review actions. This workspace does not replace emergency clinical care.</p></div><button type="button" className={primary} disabled={loading || busyId !== null} onClick={() => { setLoading(true); void load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Incident reports could not be loaded.")).finally(() => setLoading(false)); }}>Refresh</button></header>
    {error ? <p role="alert" className="rounded-xl border border-[#F0D7CF] bg-[#FFF8F5] p-3 text-sm text-[#9C5543]">{error}</p> : null}
    {notice ? <p role="status" className="rounded-xl border border-[#D2E9DF] bg-[#EDF7F2] p-3 text-sm text-[#315F50]">{notice}</p> : null}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className={panel}><p className="text-sm text-[#74857F]">Total records</p><p className="mt-2 text-3xl font-semibold tabular-nums">{statusCounts.reduce((sum, item) => sum + item.count, 0)}</p></article>{severityCounts.map((item) => <article key={item.severity} className={panel}><p className="text-sm text-[#74857F]">Open · {label(item.severity)}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{item.count}</p></article>)}</section>
    <section className={`${panel} space-y-4`}><div><h2 className="text-lg font-semibold">Report an incident</h2><p className="mt-1 text-sm text-[#74857F]">A reference number is generated automatically. Do not enter unnecessary patient-identifying or clinical details here.</p></div>
      <form onSubmit={(event) => void create(event)} className="grid gap-4 md:grid-cols-2">
        <label><span className="mb-1 block text-sm font-medium">Category</span><select className={field} value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-medium">Severity</span><select className={field} value={severity} onChange={(event) => setSeverity(event.target.value)}>{SEVERITIES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-medium">When did it occur?</span><input className={field} type="datetime-local" required value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></label>
        <label><span className="mb-1 block text-sm font-medium">Summary</span><input className={field} required minLength={4} maxLength={180} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
        <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">Description</span><textarea className={field} rows={4} required minLength={20} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">Immediate actions taken (optional)</span><textarea className={field} rows={2} maxLength={3000} value={immediateActions} onChange={(event) => setImmediateActions(event.target.value)} /></label>
        <div className="flex justify-end md:col-span-2"><button type="submit" className={primary} disabled={submitting}>{submitting ? "Recording…" : "Record incident"}</button></div>
      </form>
    </section>
    <section className={`${panel} space-y-4`}><div><h2 className="text-lg font-semibold">Incident register</h2><p className="mt-1 text-sm text-[#74857F]">Access is restricted to the Clinic Manager permission set. Incident records are confidential.</p></div>
      {loading ? <p className="py-8 text-center text-sm text-[#74857F]">Loading incident reports…</p> : items.length === 0 ? <div className="rounded-xl border border-dashed border-[#D7E3DE] p-8 text-center"><p className="font-semibold">No incident reports</p><p className="mt-1 text-sm text-[#74857F]">Recorded incidents will appear here.</p></div> : <div className="space-y-4">{items.map((item) => <article key={item.id} className="rounded-xl border border-[#E4ECE8] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#78908A]">{item.referenceNumber} · {label(item.category)}</p><h3 className="mt-1 text-lg font-semibold">{item.summary}</h3><p className="mt-1 text-xs text-[#87958F]">Occurred {dateTime(item.occurredAt)} · Reported by {item.reportedBy.displayName} ({item.reportedBy.employeeNumber})</p></div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${severityClass(item.severity)}`}>{label(item.severity)}</span><span className="rounded-full bg-[#EAF4F1] px-3 py-1.5 text-xs font-semibold text-[#176B67]">{label(item.status)}</span></div></div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4E645D]">{item.description}</p>{item.immediateActions ? <p className="mt-2 text-sm"><strong>Immediate actions:</strong> {item.immediateActions}</p> : null}{item.resolutionNotes ? <div className="mt-3 rounded-lg bg-[#F7FAF8] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[#78908A]">Review / resolution notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.resolutionNotes}</p></div> : null}
        {item.events.length ? <details className="mt-3 rounded-lg bg-[#F7FAF8] p-3"><summary className="cursor-pointer text-sm font-semibold text-[#46645B]">Audit history ({item.events.length})</summary><ol className="mt-3 space-y-2">{item.events.map((event) => <li key={event.id} className="border-s border-[#C7DCD3] ps-3 text-sm"><p className="font-medium">{label(event.action)}</p><p className="text-xs text-[#87958F]">{dateTime(event.occurredAt)}{event.actor ? ` · ${event.actor}` : ""}{event.actorEmployeeNumber ? ` (${event.actorEmployeeNumber})` : ""}</p>{event.reason ? <p className="mt-1 whitespace-pre-wrap text-[#60776F]">{event.reason}</p> : null}</li>)}</ol></details> : null}
        {NEXT[item.status].length ? <div className="mt-4 grid gap-3 rounded-xl bg-[#F7FAF8] p-3 md:grid-cols-[minmax(0,1fr)_auto]"><label><span className="mb-1 block text-xs font-semibold text-[#60776F]">Action note {"(required to resolve or close)"}</span><textarea className={field} rows={2} maxLength={2000} value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} /></label><div className="flex flex-wrap items-end gap-2">{NEXT[item.status].map((status) => <button key={status} type="button" className={primary} disabled={busyId !== null} onClick={() => void transition(item, status)}>{busyId === item.id ? "Saving…" : label(status)}</button>)}</div></div> : <p className="mt-4 text-xs text-[#87958F]">This incident is closed.</p>}
      </article>)}</div>}
    </section>
  </div>;
}
