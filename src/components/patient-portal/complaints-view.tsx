"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatPortalDateTime, humanizePortalValue } from "./portal-format";

const CATEGORIES = ["APPOINTMENT", "STAFF_CONDUCT", "WAIT_TIME", "BILLING", "FACILITY", "SERVICE_QUALITY", "OTHER"] as const;
type Complaint = {
  id: string;
  referenceNumber: string;
  category: string;
  status: string;
  subject: string;
  description: string;
  receivedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  history: Array<{ type: string; fromStatus: string | null; toStatus: string | null; occurredAt: string }>;
};

export function ComplaintsView() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("OTHER");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadComplaints = useCallback(async () => {
    const response = await fetch("/api/patient/portal/complaints", { cache: "no-store" });
    const payload = await response.json() as { complaints?: Complaint[]; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || "Your complaints could not be loaded.");
    setComplaints(Array.isArray(payload.complaints) ? payload.complaints : []);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/patient/portal/complaints", { cache: "no-store" });
        const payload = await response.json() as { complaints?: Complaint[]; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message || "Your complaints could not be loaded.");
        if (active) setComplaints(Array.isArray(payload.complaints) ? payload.complaints : []);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Your complaints could not be loaded.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function submitComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/patient/portal/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject, description }),
      });
      const payload = await response.json() as { complaint?: { referenceNumber?: string }; error?: { message?: string } };
      if (!response.ok || !payload.complaint?.referenceNumber) throw new Error(payload.error?.message || "Your complaint could not be submitted.");
      setSuccessMessage(`Your complaint was received. Reference: ${payload.complaint.referenceNumber}`);
      setSubject("");
      setDescription("");
      try {
        await loadComplaints();
      } catch {
        setErrorMessage("Your complaint was received, but the complaint list could not be refreshed. Reload this page to view its status.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Your complaint could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Patient support</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">Complaints</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#74857F]">Submit feedback or report an issue, then track the reference number and status updates recorded by the clinic. Response times are not guaranteed.</p></header>
      {errorMessage ? <p role="alert" className="rounded-xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}
      {successMessage ? <p role="status" className="rounded-xl border border-[#D8EAE1] bg-[#F0F8F4] p-4 text-sm text-[#356B55]">{successMessage}</p> : null}
      <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#2D4742]">Submit a complaint</h2>
        <form className="mt-4 grid gap-4" onSubmit={submitComplaint}>
          <label className="grid gap-2 text-sm font-medium text-[#4D665E]">Category<select value={category} onChange={(event) => setCategory(event.target.value as (typeof CATEGORIES)[number])} className="min-h-11 rounded-xl border border-[#DCE7E3] bg-white px-3 text-sm text-[#334D47] focus:border-[#176B67] focus:outline-none focus:ring-2 focus:ring-[#176B67]/15">{CATEGORIES.map((item) => <option key={item} value={item}>{humanizePortalValue(item)}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium text-[#4D665E]">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={4} maxLength={180} required className="min-h-11 rounded-xl border border-[#DCE7E3] px-3 text-sm text-[#334D47] focus:border-[#176B67] focus:outline-none focus:ring-2 focus:ring-[#176B67]/15" placeholder="Briefly describe the issue" /></label>
          <label className="grid gap-2 text-sm font-medium text-[#4D665E]">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={20} maxLength={5000} required rows={5} className="rounded-xl border border-[#DCE7E3] px-3 py-3 text-sm leading-6 text-[#334D47] focus:border-[#176B67] focus:outline-none focus:ring-2 focus:ring-[#176B67]/15" placeholder="Include the relevant details. Do not include passwords or payment card information." /></label>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#82938C]">Your complaint is linked to your verified patient account.</p><button type="submit" disabled={isSubmitting} className="min-h-11 rounded-xl bg-[#176B67] px-5 text-sm font-semibold text-white transition hover:bg-[#125B58] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Submitting…" : "Submit complaint"}</button></div>
        </form>
      </section>
      <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#2D4742]">My complaints</h2>
        {isLoading ? <div className="mt-4 h-28 animate-pulse rounded-xl bg-[#F5F8F7]" /> : null}
        {!isLoading && complaints.length === 0 ? <p className="mt-4 rounded-xl bg-[#F5F8F7] p-4 text-sm text-[#788982]">No complaints are currently linked to your patient account.</p> : null}
        <div className="mt-4 grid gap-3">{complaints.map((complaint) => <article key={complaint.id} className="rounded-xl border border-[#E8EFEC] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-[#334D47]">{complaint.subject}</p><p className="mt-1 text-xs text-[#7A8B84]">{complaint.referenceNumber} · {humanizePortalValue(complaint.category)} · {formatPortalDateTime(complaint.receivedAt)}</p></div><span className="rounded-full bg-[#EDF6F2] px-3 py-1 text-xs font-semibold text-[#34765E]">{humanizePortalValue(complaint.status)}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#5E746C]">{complaint.description}</p>{complaint.history.length > 0 ? <ol className="mt-4 grid gap-2 border-l-2 border-[#DCE9E3] pl-4">{complaint.history.map((event, index) => <li key={`${complaint.id}-${index}`} className="text-xs text-[#71857D]"><span className="font-semibold text-[#4B675D]">{humanizePortalValue(event.toStatus || event.type)}</span><span className="ml-2">{formatPortalDateTime(event.occurredAt)}</span></li>)}</ol> : null}</article>)}</div>
      </section>
    </div>
  );
}
