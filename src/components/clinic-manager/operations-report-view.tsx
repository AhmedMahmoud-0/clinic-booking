"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Report = {
  period: { from: string; to: string; timeZone: string };
  summary: {
    totalAppointments: number; cancelledAppointments: number; noShows: number; completedVisits: number;
    newPatients: number; pendingLabReviews: number; pendingRadiologyApprovals: number;
    complaintsReceived: number; incidentsReported: number;
  };
  appointmentsByStatus: Array<{ status: string; count: number }>;
  complaintStatusCounts: Array<{ status: string; count: number }>;
  incidentStatusCounts: Array<{ status: string; count: number }>;
  doctorPerformance: Array<{ doctorId: string; displayName: string; professionalTitle: string | null; completedVisits: number }>;
  visitsBySpecialty: Array<{ specialty: string; completedVisits: number }>;
  turnaround: {
    averageQueueWaitMinutes: number | null; averageLabTurnaroundMinutes: number | null;
    averageRadiologyTurnaroundMinutes: number | null; releasedLabResultsInPeriod: number;
    releasedRadiologyReportsInPeriod: number;
  };
  currentBacklogAsOf: { date: string; pendingLabReviews: number; pendingRadiologyApprovals: number };
};
type Body = { success?: boolean; report?: Report; error?: { message?: string } };

function cairoToday(): string {
  const fields = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}
function addDays(day: string, amount: number): string { const value = new Date(`${day}T00:00:00.000Z`); value.setUTCDate(value.getUTCDate() + amount); return value.toISOString().slice(0, 10); }
function label(value: string): string { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function minutes(value: number | null): string { return value === null ? "—" : `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value)} min`; }

export function OperationsReportView() {
  const today = cairoToday();
  const [from, setFrom] = useState(() => addDays(today, -6));
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (start: string, end: string) => {
    const query = new URLSearchParams({ from: start, to: end });
    const response = await fetch(`/api/clinic-manager/reports/operations?${query.toString()}`, { credentials: "same-origin", cache: "no-store" });
    const body = await response.json().catch(() => null) as Body | null;
    if (!response.ok || !body?.success || !body.report) throw new Error(body?.error?.message ?? "The operational report could not be loaded.");
    setReport(body.report);
  }, []);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ from: addDays(today, -6), to: today });
    void fetch(`/api/clinic-manager/reports/operations?${query.toString()}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => { const body = await response.json().catch(() => null) as Body | null; if (!response.ok || !body?.success || !body.report) throw new Error(body?.error?.message ?? "The operational report could not be loaded."); if (active) setReport(body.report); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "The operational report could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [today]);

  const run = async () => {
    setRunning(true); setError(null);
    try { await load(from, to); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The operational report could not be loaded."); }
    finally { setRunning(false); }
  };

  const panel = "rounded-2xl border border-[#E3ECE8] bg-white p-5 shadow-sm";
  const field = "min-h-10 w-full rounded-xl border border-[#D7E3DE] bg-white px-3 py-2 text-sm text-[#2D4742] outline-none focus:border-[#5C9B8B] focus:ring-2 focus:ring-[#D9EFEB]";
  const primary = "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white hover:bg-[#125B57] disabled:cursor-not-allowed disabled:opacity-50";
  const metricCards: Array<[string, number | undefined]> = report ? [
    ["Appointments", report.summary.totalAppointments], ["Completed visits", report.summary.completedVisits],
    ["New patients", report.summary.newPatients], ["Cancellations", report.summary.cancelledAppointments],
    ["No-shows", report.summary.noShows], ["Complaints received", report.summary.complaintsReceived],
    ["Incidents reported", report.summary.incidentsReported], ["Lab reviews pending now", report.summary.pendingLabReviews],
    ["Radiology approvals pending now", report.summary.pendingRadiologyApprovals],
  ] : [];

  return <div className="space-y-6 text-[#243B3B]">
    <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Clinic operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Operational reports</h1><p className="mt-2 text-sm leading-6 text-[#74857F]">Aggregate activity, service turnaround, and workload indicators. No patient identities or clinical details are included.</p></header>
    <section className={`${panel} flex flex-wrap items-end gap-3`}>
      <label className="min-w-44 flex-1"><span className="mb-1 block text-sm font-medium">From (Cairo date)</span><input type="date" className={field} value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
      <label className="min-w-44 flex-1"><span className="mb-1 block text-sm font-medium">To (Cairo date)</span><input type="date" className={field} value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} /></label>
      <button type="button" className={primary} disabled={running || loading || !from || !to || from > to || to > today} onClick={() => void run()}>{running ? "Generating…" : "Run report"}</button>
    </section>
    {error ? <p role="alert" className="rounded-xl border border-[#F0D7CF] bg-[#FFF8F5] p-3 text-sm text-[#9C5543]">{error}</p> : null}
    {loading ? <p className="py-8 text-center text-sm text-[#74857F]">Loading operational report…</p> : report ? <>
      <p className="text-xs text-[#87958F]">Reporting period: {report.period.from} to {report.period.to} · {report.period.timeZone}. Current diagnostic backlog is a point-in-time count as of {report.currentBacklogAsOf.date}.</p>
      <section aria-label="Operational summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metricCards.map(([title, value]) => <article key={title} className={panel}><p className="text-sm text-[#74857F]">{title}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{value ?? "—"}</p></article>)}</section>
      <section className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Average service turnaround</h2><div className="grid gap-3 sm:grid-cols-3">{[["Queue wait", report.turnaround.averageQueueWaitMinutes], ["Laboratory result turnaround", report.turnaround.averageLabTurnaroundMinutes], ["Radiology report turnaround", report.turnaround.averageRadiologyTurnaroundMinutes]].map(([title, value]) => <div key={String(title)} className="rounded-xl bg-[#F5F8F7] p-4"><p className="text-sm text-[#74857F]">{String(title)}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{minutes(value as number | null)}</p></div>)}</div><p className="text-xs text-[#87958F]">Queue wait is measured from check-in to service start. Diagnostic turnaround is measured from result/report authoring to release for released records in the selected period.</p></section>
      <section className="grid gap-4 xl:grid-cols-2"><div className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Appointments by status</h2>{report.appointmentsByStatus.length ? report.appointmentsByStatus.map((item) => <div key={item.status} className="flex items-center justify-between border-b border-[#EEF2F0] py-2 text-sm last:border-0"><span>{label(item.status)}</span><strong className="tabular-nums">{item.count}</strong></div>) : <p className="text-sm text-[#74857F]">No appointments in this period.</p>}</div>
        <div className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Complaint and incident status</h2><div><h3 className="text-sm font-semibold text-[#60776F]">Complaints</h3>{report.complaintStatusCounts.length ? report.complaintStatusCounts.map((item) => <div key={item.status} className="flex justify-between border-b border-[#EEF2F0] py-2 text-sm last:border-0"><span>{label(item.status)}</span><strong className="tabular-nums">{item.count}</strong></div>) : <p className="py-2 text-sm text-[#74857F]">No complaints received in this period.</p>}</div><div><h3 className="text-sm font-semibold text-[#60776F]">Incidents</h3>{report.incidentStatusCounts.length ? report.incidentStatusCounts.map((item) => <div key={item.status} className="flex justify-between border-b border-[#EEF2F0] py-2 text-sm last:border-0"><span>{label(item.status)}</span><strong className="tabular-nums">{item.count}</strong></div>) : <p className="py-2 text-sm text-[#74857F]">No incidents reported in this period.</p>}</div></div></section>
      <section className="grid gap-4 xl:grid-cols-2"><div className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Visits by specialty</h2>{report.visitsBySpecialty.length ? report.visitsBySpecialty.map((item) => <div key={item.specialty} className="flex items-center justify-between border-b border-[#EEF2F0] py-2 text-sm last:border-0"><span>{item.specialty}</span><strong className="tabular-nums">{item.completedVisits}</strong></div>) : <p className="text-sm text-[#74857F]">No completed visits in this period.</p>}<p className="text-xs text-[#87958F]">Each doctor is counted under their primary specialty to avoid double counting.</p></div><div className={`${panel} space-y-3`}><h2 className="text-lg font-semibold">Doctor performance</h2>{report.doctorPerformance.length ? <div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-start text-sm"><thead className="border-b border-[#E5ECE8] text-xs text-[#74857F]"><tr><th className="py-2 pe-4">Doctor</th><th className="py-2 pe-4">Title</th><th className="py-2 text-end">Completed visits</th></tr></thead><tbody>{report.doctorPerformance.map((item) => <tr key={item.doctorId} className="border-b border-[#EEF2F0] last:border-0"><td className="py-3 pe-4 font-medium">{item.displayName}</td><td className="py-3 pe-4 text-[#74857F]">{item.professionalTitle ?? "—"}</td><td className="py-3 text-end tabular-nums">{item.completedVisits}</td></tr>)}</tbody></table></div> : <p className="text-sm text-[#74857F]">No completed visits in this period.</p>}</div></section>
      <section className="rounded-2xl border border-[#DCEAE5] bg-[#EDF6F2] p-5"><h2 className="font-semibold text-[#31534B]">Financial detail</h2><p className="mt-1 text-sm leading-6 text-[#647C73]">Invoice, payment, discount, refund, and collection detail remains in the existing Phase 9 financial report and its billing permission boundary.</p><Link href="/clinic-manager/reports/financial" className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white hover:bg-[#125B57]">Open financial report</Link></section>
    </> : null}
  </div>;
}
