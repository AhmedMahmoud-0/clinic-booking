"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPortalDate, humanizePortalValue } from "./portal-format";

type VisitDetails = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  doctor: { name: string; professionalTitle: string | null; specialty: string | null };
  diagnoses: Array<{ name: string; isPrimary: boolean }>;
};

export function VisitDetailView({ visitId }: { visitId: string }) {
  const [visit, setVisit] = useState<VisitDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/patient/portal/visits/${encodeURIComponent(visitId)}`, { cache: "no-store" });
        const payload = await response.json() as { visit?: VisitDetails; error?: { message?: string } };
        if (!response.ok || !payload.visit) throw new Error(payload.error?.message || "This visit is not available in your patient account.");
        if (active) setVisit(payload.visit);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "This visit could not be loaded.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [visitId]);

  return (
    <div className="space-y-6">
      <Link href="/portal/visits" className="inline-flex min-h-9 items-center text-sm font-semibold text-[#176B67] hover:underline">← Back to visit history</Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Completed encounter</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">Visit details</h1>
        <p className="mt-2 text-sm leading-6 text-[#74857F]">Approved information associated with this completed visit.</p>
      </header>
      {errorMessage ? <section role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-5 text-sm text-[#9C5543]">{errorMessage}<Link href="/portal/visits" className="mt-3 block font-semibold text-[#176B67] underline">Return to visit history</Link></section> : null}
      {isLoading ? <div className="h-52 animate-pulse rounded-2xl bg-white" aria-label="Loading visit details" /> : null}
      {visit ? (
        <>
          <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EEF2F0] pb-5">
              <div>
                <span className="rounded-full bg-[#E9F5EF] px-3 py-1 text-xs font-semibold text-[#34765E]">{humanizePortalValue("COMPLETED")}</span>
                <h2 className="mt-3 text-xl font-semibold text-[#2D4943]">{visit.doctor.name}</h2>
                <p className="mt-1 text-sm text-[#788982]">{visit.doctor.professionalTitle || visit.doctor.specialty || "Medical doctor"}</p>
              </div>
              <div className="text-sm text-[#5E746C]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Visit date</p>
                <p className="mt-2 font-semibold">{formatPortalDate(visit.completedAt || visit.startedAt)}</p>
              </div>
            </div>
            <div className="grid gap-5 pt-5 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#779087]">Specialty</h3>
                <p className="mt-2 text-sm font-medium text-[#405B53]">{visit.doctor.specialty || "Not recorded"}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#779087]">Visit status</h3>
                <p className="mt-2 text-sm font-medium text-[#405B53]">Completed</p>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-7">
            <h2 className="text-lg font-semibold text-[#2D4742]">Released diagnoses</h2>
            <p className="mt-1 text-sm text-[#7B8B85]">Diagnoses recorded on the completed encounter.</p>
            {visit.diagnoses.length ? (
              <ul className="mt-4 grid gap-3">
                {visit.diagnoses.map((diagnosis, index) => (
                  <li key={`${visit.id}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F5F8F7] px-4 py-3">
                    <span className="text-sm font-medium text-[#405B53]">{diagnosis.name}</span>
                    {diagnosis.isPrimary ? <span className="rounded-full bg-[#E2F0EA] px-2.5 py-1 text-[11px] font-semibold text-[#34765E]">Primary</span> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 rounded-xl bg-[#F5F8F7] p-4 text-sm text-[#788982]">No diagnosis is available for patient display on this visit.</p>}
          </section>
          <section className="rounded-2xl border border-[#DCEAE5] bg-[#EDF6F2] p-5 sm:p-6">
            <h2 className="font-semibold text-[#31534B]">Prescriptions and diagnostic results</h2>
            <p className="mt-2 text-sm leading-6 text-[#647C73]">Issued prescriptions and released laboratory or radiology results are shown in your Medical Records area, subject to their individual approval and release status.</p>
            <Link href="/portal/records" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white hover:bg-[#125A56]">Open medical records</Link>
          </section>
        </>
      ) : null}
    </div>
  );
}
