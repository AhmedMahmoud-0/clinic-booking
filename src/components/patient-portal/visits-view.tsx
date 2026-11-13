"use client";

import { useEffect, useState } from "react";
import { formatPortalDate, humanizePortalValue } from "./portal-format";

type Visit = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  doctor: { name: string; professionalTitle: string | null; specialty: string | null };
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
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#74857F]">A list of completed visits linked to your patient account. Clinical summaries and released documents are handled in the next portal update.</p>
      </header>
      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}
      {isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-white" /> : null}
      {!isLoading && !errorMessage && visits.length === 0 ? <section className="rounded-2xl border border-[#E3ECE8] bg-white p-8"><h2 className="font-semibold text-[#334D47]">No completed visits yet</h2><p className="mt-2 text-sm text-[#7B8B85]">Completed visits will appear here when they are recorded in the clinic system.</p></section> : null}
      <div className="grid gap-3">
        {visits.map((visit) => (
          <article key={visit.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E3ECE8] bg-white p-5">
            <div>
              <p className="font-semibold text-[#334D47]">{visit.doctor.name}</p>
              <p className="mt-1 text-sm text-[#788982]">{visit.doctor.specialty || visit.doctor.professionalTitle || "Completed visit"}</p>
              <p className="mt-2 text-sm text-[#5E746C]">{formatPortalDate(visit.completedAt || visit.startedAt)}</p>
            </div>
            <span className="rounded-full bg-[#E9F5EF] px-3 py-1 text-xs font-semibold text-[#34765E]">{humanizePortalValue("COMPLETED")}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
