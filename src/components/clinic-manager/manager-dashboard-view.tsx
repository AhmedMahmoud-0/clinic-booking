"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Overview = {
  period: { date: string; timeZone: string };
  metrics: {
    appointmentsToday: number;
    cancelledAppointmentsToday: number;
    noShowsToday: number;
    activeClinicQueue: number;
    completedVisitsToday: number;
    pendingLabReviews: number;
    pendingRadiologyApprovals: number;
  };
};

type OverviewBody = { success?: boolean; overview?: Overview; error?: { message?: string } };

const METRICS: Array<{ key: keyof Overview["metrics"]; label: string; description: string }> = [
  { key: "appointmentsToday", label: "Appointments today", description: "Appointments scheduled for the Cairo clinic day." },
  { key: "completedVisitsToday", label: "Completed visits", description: "Encounters completed today." },
  { key: "activeClinicQueue", label: "Patients in clinic queue", description: "Waiting, called, or currently in service." },
  { key: "noShowsToday", label: "No-shows today", description: "Appointments recorded as no-show today." },
  { key: "cancelledAppointmentsToday", label: "Cancellations today", description: "Appointments scheduled for today and marked cancelled." },
  { key: "pendingLabReviews", label: "Lab results awaiting review", description: "Count only; no patient or result details are shown." },
  { key: "pendingRadiologyApprovals", label: "Radiology reports awaiting approval", description: "Count only; report content remains restricted." },
];

function formatCairoDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "Africa/Cairo" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

async function fetchOverview(): Promise<Overview> {
  const response = await fetch("/api/clinic-manager/overview", { credentials: "same-origin", cache: "no-store" });
  const body = await response.json().catch(() => null) as OverviewBody | null;
  if (!response.ok || !body?.success || !body.overview) {
    throw new Error(body?.error?.message ?? "The operations overview could not be loaded.");
  }
  return body.overview;
}

export function ManagerDashboardView() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchOverview()
      .then((data) => { if (active) setOverview(data); })
      .catch((error: unknown) => { if (active) setErrorMessage(error instanceof Error ? error.message : "The operations overview could not be loaded."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const refresh = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      setOverview(await fetchOverview());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The operations overview could not be loaded.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const panel = "rounded-2xl border border-[#E3ECE8] bg-white p-5 shadow-sm";

  return (
    <div className="space-y-6 text-[#243B3B]">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Clinic operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Operations dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-[#74857F]">A role-scoped view of clinic activity and operational workload.</p>
          {overview ? <p className="mt-2 text-xs font-medium text-[#78908A]">Clinic date: {formatCairoDate(overview.period.date)} · {overview.period.timeZone}</p> : null}
        </div>
        <button type="button" onClick={() => void refresh()} disabled={isLoading || isRefreshing} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#C9DDD6] px-4 text-sm font-semibold text-[#176B67] hover:bg-[#F0F7F4] disabled:cursor-not-allowed disabled:opacity-50">
          {isRefreshing ? "Refreshing…" : "Refresh overview"}
        </button>
      </header>

      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}

      <section aria-label="Clinic operations metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((metric) => (
          <article key={metric.key} className={panel}>
            <p className="text-sm font-medium text-[#647C73]">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-[#24504A]">{isLoading ? "—" : overview?.metrics[metric.key] ?? 0}</p>
            <p className="mt-2 text-xs leading-5 text-[#87958F]">{metric.description}</p>
          </article>
        ))}
      </section>

      <section className={`${panel} flex flex-wrap items-center justify-between gap-4`}>
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-[#2D4742]">Staff oversight</h2>
          <p className="mt-1 text-sm leading-6 text-[#74857F]">Review employee status and active role assignments without exposing authentication details or clinical records.</p>
        </div>
        <Link href="/clinic-manager/staff" className="inline-flex min-h-10 items-center rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white hover:bg-[#125B57]">Open staff oversight</Link>
      </section>

      <section className="rounded-2xl border border-[#DCEAE5] bg-[#EDF6F2] p-5 sm:p-6">
        <h2 className="font-semibold text-[#31534B]">Operational data boundary</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[#647C73]">This dashboard shows aggregate counts only. It does not expose patient identities, diagnoses, clinical notes, laboratory values, radiology findings, or full medical records. Each detailed workflow remains protected by its own permission and record-state rules.</p>
      </section>
    </div>
  );
}
