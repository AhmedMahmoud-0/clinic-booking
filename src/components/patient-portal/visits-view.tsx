"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPortalDate, humanizePortalValue } from "./portal-format";

type Visit = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  doctor: { name: string; professionalTitle: string | null; specialty: string | null };
  diagnoses: Array<{ name: string; isPrimary: boolean }>;
};

export function VisitsView() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/patient/portal/visits", { cache: "no-store" });
        const payload = await response.json() as { visits?: Visit[]; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message || "Visit history could not be loaded.");
        if (active) setVisits(Array.isArray(payload.visits) ? payload.visits : []);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Visit history could not be loaded.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Completed appointments</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">Visit history</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#74857F]">Open a completed visit to review its released summary and diagnosis. Prescriptions and diagnostic results are available in Medical Records.</p>
      </header>
      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}
      {isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-white" /> : null}
      {!isLoading && !errorMessage && visits.length === 0 ? <section className="rounded-2xl border border-[#E3ECE8] bg-white p-8"><h2 className="font-semibold text-[#334D47]">No completed visits yet</h2><p className="mt-2 text-sm text-[#7B8B85]">Completed visits will appear here when they are recorded in the clinic system.</p></section> : null}
      <div className="grid gap-3">
        {visits.map((visit) => (
          <article key={visit.id} className="rounded-2xl border border-[#E3ECE8] bg-white p-5 transition hover:border-[#C9DDD6] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-[#334D47]">{visit.doctor.name}</p>
                <p className="mt-1 text-sm text-[#788982]">{visit.doctor.specialty || visit.doctor.professionalTitle || "Completed visit"}</p>
                <p className="mt-2 text-sm text-[#5E746C]">{formatPortalDate(visit.completedAt || visit.startedAt)}</p>
                {visit.diagnoses[0] ? <p className="mt-3 text-sm text-[#526A62]">Primary diagnosis: <span className="font-medium">{visit.diagnoses.find((diagnosis) => diagnosis.isPrimary)?.name || visit.diagnoses[0].name}</span></p> : null}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                <span className="rounded-full bg-[#E9F5EF] px-3 py-1 text-xs font-semibold text-[#34765E]">{humanizePortalValue("COMPLETED")}</span>
                <Link href={`/portal/visits/${encodeURIComponent(visit.id)}`} className="inline-flex min-h-10 items-center rounded-xl border border-[#C9DDD6] px-4 text-sm font-semibold text-[#176B67] hover:bg-[#F0F7F4]">View visit details</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
