"use client";

import { useState, type FormEvent } from "react";

type IntakeChannel = "PHONE" | "IN_PERSON";
type ComplaintCategory = "APPOINTMENT" | "STAFF_CONDUCT" | "WAIT_TIME" | "BILLING" | "FACILITY" | "SERVICE_QUALITY" | "OTHER";

const CATEGORIES: Array<{ value: ComplaintCategory; label: string }> = [
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "STAFF_CONDUCT", label: "Staff conduct" },
  { value: "WAIT_TIME", label: "Waiting time" },
  { value: "BILLING", label: "Billing" },
  { value: "FACILITY", label: "Facility" },
  { value: "SERVICE_QUALITY", label: "Service quality" },
  { value: "OTHER", label: "Other" },
];

interface CreatedComplaint {
  referenceNumber: string;
  status: string;
  receivedAt: string;
}

export function ReceptionComplaintIntakeView() {
  const [channel, setChannel] = useState<IntakeChannel>("PHONE");
  const [category, setCategory] = useState<ComplaintCategory>("OTHER");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterPhone, setSubmitterPhone] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedComplaint | null>(null);

  const field = "min-h-11 w-full rounded-xl border border-[#D7E3DE] bg-white px-3 py-2 text-sm text-[#2D4742] outline-none focus:border-[#5C9B8B] focus:ring-2 focus:ring-[#D9EFEB]";
  const label = "mb-1.5 block text-xs font-semibold text-[#60776F]";
  const panel = "rounded-2xl border border-[#E3ECE8] bg-white p-5 shadow-sm sm:p-6";
  const button = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#176B67] px-5 text-sm font-semibold text-white hover:bg-[#125B57] disabled:cursor-not-allowed disabled:opacity-50";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const response = await fetch("/api/reception/complaints", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          category,
          subject,
          description,
          ...(submitterName.trim() ? { submitterName: submitterName.trim() } : {}),
          ...(submitterPhone.trim() ? { submitterPhone: submitterPhone.trim() } : {}),
          ...(submitterEmail.trim() ? { submitterEmail: submitterEmail.trim() } : {}),
        }),
      });
      const body = await response.json().catch(() => null) as {
        success?: boolean;
        complaint?: CreatedComplaint;
        error?: { message?: string };
      } | null;
      if (!response.ok || !body?.success || !body.complaint) {
        throw new Error(body?.error?.message ?? "The complaint could not be recorded. Please review the details and try again.");
      }
      setCreated(body.complaint);
      setSubject("");
      setDescription("");
      setSubmitterName("");
      setSubmitterPhone("");
      setSubmitterEmail("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The complaint could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 text-[#243B3B]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Reception workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Record a complaint</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#74857F]">Record a complaint received by phone or in person. The system assigns the reference number and records the receiving employee automatically.</p>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-[#F0D7CF] bg-[#FFF8F5] p-3 text-sm text-[#9C5543]">{error}</p> : null}
      {created ? <section role="status" className="rounded-2xl border border-[#D2E9DF] bg-[#EDF7F2] p-5 text-[#315F50]"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Complaint recorded</p><p className="mt-1 text-xl font-semibold">{created.referenceNumber}</p><p className="mt-1 text-sm">Status: {created.status.replaceAll("_", " ")}. The complaint is now in the Clinic Manager queue.</p><button type="button" className="mt-3 text-sm font-semibold underline underline-offset-4" onClick={() => setCreated(null)}>Record another complaint</button></section> : null}

      <form onSubmit={submit} className={`${panel} space-y-5`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Received through</span><select className={field} value={channel} onChange={(event) => setChannel(event.target.value as IntakeChannel)}><option value="PHONE">Phone</option><option value="IN_PERSON">In person</option></select></label>
          <label><span className={label}>Category</span><select className={field} value={category} onChange={(event) => setCategory(event.target.value as ComplaintCategory)}>{CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
        <label className="block"><span className={label}>Complaint subject</span><input className={field} value={subject} onChange={(event) => setSubject(event.target.value)} required minLength={4} maxLength={180} /></label>
        <label className="block"><span className={label}>Description</span><textarea className={field} value={description} onChange={(event) => setDescription(event.target.value)} required minLength={20} maxLength={5000} rows={5} /><span className="mt-1 block text-xs text-[#87958F]">Describe the concern factually. Do not enter diagnoses, clinical notes, or unnecessary medical details.</span></label>
        <div className="border-t border-[#EEF2F0] pt-5">
          <h2 className="text-sm font-semibold">Submitter contact (optional)</h2>
          <p className="mt-1 text-xs text-[#87958F]">Collect only details needed to follow up. Do not enter patient identifiers or link a medical record here.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label><span className={label}>Name</span><input className={field} value={submitterName} onChange={(event) => setSubmitterName(event.target.value)} maxLength={160} autoComplete="name" /></label>
            <label><span className={label}>Phone</span><input className={field} value={submitterPhone} onChange={(event) => setSubmitterPhone(event.target.value)} maxLength={30} autoComplete="tel" /></label>
            <label><span className={label}>Email</span><input className={field} type="email" value={submitterEmail} onChange={(event) => setSubmitterEmail(event.target.value)} maxLength={254} autoComplete="email" /></label>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF2F0] pt-5"><p className="max-w-xl text-xs leading-5 text-[#87958F]">The complaint will be saved as RECEIVED. Reception cannot assign, acknowledge, resolve, reject, or close complaints from this form.</p><button type="submit" className={button} disabled={busy}>{busy ? "Recording…" : "Record complaint"}</button></div>
      </form>
    </div>
  );
}
