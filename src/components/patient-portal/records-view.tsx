"use client";

import { useEffect, useState, type ReactNode } from "react";
import { formatPortalDate, humanizePortalValue } from "./portal-format";

type PatientRecords = {
  visits: Array<{
    id: string;
    startedAt: string;
    completedAt: string | null;
    doctor: { name: string; professionalTitle: string | null; specialty: string | null };
    diagnoses: Array<{ name: string; isPrimary: boolean }>;
  }>;
  prescriptions: Array<{
    id: string;
    issuedAt: string | null;
    generalInstructions: string | null;
    doctor: string;
    items: Array<{
      id: string;
      medicationName: string;
      strength: string | null;
      dosage: string;
      route: string | null;
      frequency: string;
      durationDays: number | null;
      quantity: string | null;
      quantityUnit: string | null;
      isPrn: boolean;
      refills: number;
      instructions: string | null;
    }>;
  }>;
  labResults: Array<{
    id: string;
    test: { code: string; name: string };
    orderReference: string;
    summary: string | null;
    resultedAt: string;
    releasedAt: string | null;
    values: Array<{
      componentCode: string;
      componentName: string;
      valueType: string;
      valueText: string | null;
      valueNumeric: string | null;
      valueBoolean: boolean | null;
      unit: string | null;
      referenceRange: string | null;
      abnormalFlag: string;
    }>;
  }>;
  radiologyReports: Array<{
    id: string;
    procedure: { code: string; name: string; modality: string };
    orderReference: string;
    performedAt: string | null;
    authoredAt: string;
    releasedAt: string | null;
    findings: string;
    impression: string;
    recommendations: string | null;
  }>;
};

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#2D4742]">{title}</h2>
        <p className="mt-1 text-sm text-[#7B8B85]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-[#F5F8F7] p-4 text-sm text-[#788982]">{children}</p>;
}

export function RecordsView() {
  const [records, setRecords] = useState<PatientRecords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/patient/portal/records", { cache: "no-store" });
        const payload = await response.json() as { records?: PatientRecords; error?: { message?: string } };
        if (!response.ok || !payload.records) throw new Error(payload.error?.message || "Your medical records could not be loaded.");
        if (active) setRecords(payload.records);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Your medical records could not be loaded.");
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
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Your health information</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">Medical records</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#74857F]">This page includes completed visits, issued prescriptions, and diagnostic results that have been released by the clinic.</p>
      </header>
      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}
      {isLoading ? <div className="h-32 animate-pulse rounded-2xl bg-white" aria-label="Loading medical records" /> : null}
      {!isLoading && !errorMessage && records ? (
        <>
          <Panel title="Completed visits" subtitle="Only encounters marked completed are listed.">
            {records.visits.length === 0 ? <Empty>No completed visits are available yet.</Empty> : (
              <div className="divide-y divide-[#EEF2F0]">
                {records.visits.map((visit) => (
                  <article key={visit.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#334D47]">{visit.doctor.name}</p>
                        <p className="mt-1 text-sm text-[#788982]">{visit.doctor.specialty || visit.doctor.professionalTitle || "Completed visit"}</p>
                      </div>
                      <span className="rounded-full bg-[#E9F5EF] px-3 py-1 text-xs font-semibold text-[#34765E]">Completed</span>
                    </div>
                    <p className="mt-2 text-sm text-[#5E746C]">{formatPortalDate(visit.completedAt || visit.startedAt)}</p>
                    {visit.diagnoses.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{visit.diagnoses.map((diagnosis, index) => <span key={`${visit.id}-${index}`} className="rounded-lg bg-[#F3F7F5] px-3 py-1.5 text-xs text-[#4E6861]">{diagnosis.name}{diagnosis.isPrimary ? " · Primary" : ""}</span>)}</div> : null}
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Issued prescriptions" subtitle="Draft and cancelled prescriptions are not shown.">
            {records.prescriptions.length === 0 ? <Empty>No issued prescriptions are available.</Empty> : (
              <div className="grid gap-4">
                {records.prescriptions.map((prescription) => (
                  <article key={prescription.id} className="rounded-xl border border-[#E8EFEC] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#334D47]">Prescription</p>
                      <span className="text-xs text-[#71857D]">Issued {formatPortalDate(prescription.issuedAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#7A8B84]">Prescribed by {prescription.doctor}</p>
                    <div className="mt-3 grid gap-3">
                      {prescription.items.map((item) => (
                        <div key={item.id} className="rounded-lg bg-[#F7F9F8] p-3">
                          <p className="font-semibold text-[#31534B]">{item.medicationName}{item.strength ? ` · ${item.strength}` : ""}</p>
                          <p className="mt-1 text-sm leading-6 text-[#5F746C]">{item.dosage} · {item.route || "Route not specified"} · {item.frequency}</p>
                          <p className="text-xs text-[#7A8B84]">{item.durationDays ? `${item.durationDays} days` : "Duration not specified"}{item.isPrn ? " · As needed" : ""}{item.refills > 0 ? ` · ${item.refills} refills` : ""}{item.quantity ? ` · Quantity ${item.quantity}${item.quantityUnit ? ` ${item.quantityUnit}` : ""}` : ""}</p>
                          {item.instructions ? <p className="mt-2 text-sm text-[#536963]">{item.instructions}</p> : null}
                        </div>
                      ))}
                    </div>
                    {prescription.generalInstructions ? <p className="mt-3 text-sm leading-6 text-[#536963]">{prescription.generalInstructions}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Laboratory results" subtitle="Only released results and their released values appear here.">
            {records.labResults.length === 0 ? <Empty>No released laboratory results are available.</Empty> : (
              <div className="grid gap-4">
                {records.labResults.map((result) => (
                  <article key={result.id} className="rounded-xl border border-[#E8EFEC] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-semibold text-[#334D47]">{result.test.name}</p><p className="mt-1 text-xs text-[#7A8B84]">Order {result.orderReference} · {result.test.code}</p></div>
                      <span className="rounded-full bg-[#E9F5EF] px-3 py-1 text-xs font-semibold text-[#34765E]">Released</span>
                    </div>
                    <p className="mt-2 text-xs text-[#7A8B84]">Released {formatPortalDate(result.releasedAt)}</p>
                    {result.summary ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#526A62]">{result.summary}</p> : null}
                    {result.values.length > 0 ? (
                      <div className="mt-3 overflow-x-auto rounded-lg border border-[#E8EFEC]">
                        <table className="w-full min-w-[520px] text-left text-sm">
                          <thead className="bg-[#F5F8F7] text-xs text-[#647A72]"><tr><th className="px-3 py-2">Test component</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Reference range</th><th className="px-3 py-2">Flag</th></tr></thead>
                          <tbody className="divide-y divide-[#EEF2F0]">{result.values.map((value, index) => {
                            const displayValue = value.valueNumeric ?? value.valueText ?? (value.valueBoolean === null ? "Not recorded" : value.valueBoolean ? "Yes" : "No");
                            return <tr key={`${result.id}-${index}`}><td className="px-3 py-2 font-medium text-[#405B53]">{value.componentName}</td><td className="px-3 py-2 text-[#526A62]">{displayValue}{value.unit ? ` ${value.unit}` : ""}</td><td className="px-3 py-2 text-[#71857D]">{value.referenceRange || "—"}</td><td className="px-3 py-2 text-[#71857D]">{humanizePortalValue(value.abnormalFlag)}</td></tr>;
                          })}</tbody>
                        </table>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Radiology reports" subtitle="Reports are visible only after radiology approval and release.">
            {records.radiologyReports.length === 0 ? <Empty>No released radiology reports are available.</Empty> : (
              <div className="grid gap-4">
                {records.radiologyReports.map((report) => (
                  <article key={report.id} className="rounded-xl border border-[#E8EFEC] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-[#334D47]">{report.procedure.name}</p><p className="mt-1 text-xs text-[#7A8B84]">{humanizePortalValue(report.procedure.modality)} · Order {report.orderReference}</p></div><span className="rounded-full bg-[#E9F5EF] px-3 py-1 text-xs font-semibold text-[#34765E]">Released</span></div>
                    <p className="mt-2 text-xs text-[#7A8B84]">Performed {formatPortalDate(report.performedAt)} · Released {formatPortalDate(report.releasedAt)}</p>
                    <div className="mt-4 grid gap-3"><div><h3 className="text-xs font-semibold uppercase tracking-wide text-[#779087]">Findings</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#526A62]">{report.findings}</p></div><div><h3 className="text-xs font-semibold uppercase tracking-wide text-[#779087]">Impression</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#526A62]">{report.impression}</p></div>{report.recommendations ? <div><h3 className="text-xs font-semibold uppercase tracking-wide text-[#779087]">Recommendations</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#526A62]">{report.recommendations}</p></div> : null}</div>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
