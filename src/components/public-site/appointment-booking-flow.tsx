"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { PublicClinicCatalog } from "@/server/public-site/public-catalog";
import { PublicIcon } from "./public-icon";

type Specialty = PublicClinicCatalog["specialties"][number];
type Doctor = PublicClinicCatalog["doctors"][number];
type ConsultationService = Doctor["services"][number];
type BookingMode = "guest" | "account";
type BookingPatient = { id: string; displayName: string; isSelf: boolean; relationshipType: string | null };
type AvailabilitySlot = { startsAt: string; endsAt: string; startTime: string; endTime: string };
type BookingConfirmation = {
  appointmentId?: string;
  bookingReference: string;
  status: string;
  startsAt: string;
  endsAt: string;
  localDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  bookedPrice: string;
  currencyCode: string;
  doctor: { displayName: string; professionalTitle: string | null };
  service: { name: string };
  guestManagementToken?: string;
};

const STEPS = ["Specialty", "Doctor", "Date & Time", "Your details", "Confirmation"];

function todayInCairo(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function readableDate(value: string): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function AppointmentBookingFlow({
  specialties,
  doctors,
  initialSpecialtyId,
  initialDoctorId,
}: {
  specialties: Specialty[];
  doctors: Doctor[];
  initialSpecialtyId: string | null;
  initialDoctorId: string | null;
}) {
  const bookableDoctors = useMemo(() => doctors.filter((doctor) => doctor.isBookable && doctor.services.some((service) => service.type === "CONSULTATION" || service.type === "FOLLOW_UP")), [doctors]);
  const initialDoctor = bookableDoctors.find((doctor) => doctor.id === initialDoctorId) ?? null;
  const initialDoctorSpecialty = initialDoctor?.specialties.find((item) => item.isPrimary) ?? initialDoctor?.specialties[0] ?? null;
  const resolvedInitialSpecialtyId = initialSpecialtyId && specialties.some((item) => item.id === initialSpecialtyId)
    ? initialSpecialtyId
    : initialDoctorSpecialty?.id ?? "";
  const [step, setStep] = useState(0);
  const [specialtyId, setSpecialtyId] = useState(resolvedInitialSpecialtyId);
  const [doctorId, setDoctorId] = useState(initialDoctor?.id ?? "");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [mode, setMode] = useState<BookingMode>("guest");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [patients, setPatients] = useState<BookingPatient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const selectedSpecialty = specialties.find((item) => item.id === specialtyId) ?? null;
  const specialtyDoctors = bookableDoctors.filter((doctor) => doctor.specialties.some((item) => item.id === specialtyId));
  const selectedDoctor = bookableDoctors.find((item) => item.id === doctorId) ?? null;
  const services: ConsultationService[] = selectedDoctor?.services.filter((service) => service.type === "CONSULTATION" || service.type === "FOLLOW_UP") ?? [];
  const selectedService = services.find((item) => item.serviceId === serviceId) ?? null;

  function chooseSpecialty(id: string) {
    setSpecialtyId(id);
    setDoctorId("");
    setServiceId("");
    setDate("");
    setSlots([]);
    setSelectedSlot(null);
    setAvailabilityError("");
    setAvailabilityChecked(false);
  }

  function chooseDoctor(id: string) {
    setDoctorId(id);
    setServiceId("");
    setDate("");
    setSlots([]);
    setSelectedSlot(null);
    setAvailabilityError("");
    setAvailabilityChecked(false);
  }

  async function loadAvailability() {
    if (!selectedDoctor || !selectedService || !date) return;
    setAvailabilityLoading(true);
    setAvailabilityError("");
    setAvailabilityChecked(false);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const query = new URLSearchParams({ doctorId: selectedDoctor.id, serviceId: selectedService.serviceId, date });
      const response = await fetch(`/api/public/appointment-availability?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json() as { data?: { slots?: AvailabilitySlot[] }; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Available times could not be loaded. Try again.");
      setSlots(Array.isArray(payload.data?.slots) ? payload.data.slots : []);
      setAvailabilityChecked(true);
    } catch (error) {
      setAvailabilityError(error instanceof Error ? error.message : "Available times could not be loaded. Try again.");
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function chooseBookingMode(nextMode: BookingMode) {
    setSubmitError("");
    if (nextMode === "guest") {
      setMode("guest");
      setAccountError("");
      return;
    }
    setMode("account");
    setAccountError("");
    setAccountLoading(true);
    try {
      const response = await fetch("/api/patient/booking-context", { cache: "no-store" });
      const payload = await response.json() as { patients?: BookingPatient[]; error?: { message?: string } };
      if (!response.ok) throw new Error(response.status === 401 ? "Sign in to your patient account to use account booking." : payload.error?.message || "Your booking profile could not be loaded.");
      const options = Array.isArray(payload.patients) ? payload.patients : [];
      if (options.length === 0) throw new Error("No active patient booking identity is available for this account.");
      setPatients(options);
      setPatientId(options[0].id);
    } catch (error) {
      setPatients([]);
      setPatientId("");
      setAccountError(error instanceof Error ? error.message : "Your booking profile could not be loaded.");
    } finally {
      setAccountLoading(false);
    }
  }

  function canContinue(): boolean {
    if (step === 0) return Boolean(selectedSpecialty);
    if (step === 1) return Boolean(selectedDoctor && selectedService);
    if (step === 2) return Boolean(date && selectedSlot);
    if (step === 3) {
      if (mode === "guest") return guestName.trim().length >= 3 && guestPhone.trim().length >= 7;
      return Boolean(patientId && patients.some((patient) => patient.id === patientId));
    }
    return false;
  }

  async function submitBooking() {
    if (!selectedDoctor || !selectedService || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const endpoint = mode === "guest" ? "/api/public/appointments/guest" : "/api/patient/appointments";
      const body = mode === "guest"
        ? { fullName: guestName.trim(), phone: guestPhone.trim(), ...(guestEmail.trim() ? { email: guestEmail.trim() } : {}), doctorId: selectedDoctor.id, serviceId: selectedService.serviceId, startsAt: selectedSlot.startsAt }
        : { patientId, doctorId: selectedDoctor.id, serviceId: selectedService.serviceId, startsAt: selectedSlot.startsAt };
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      const payload = await response.json() as { appointment?: BookingConfirmation; error?: { message?: string } };
      if (!response.ok || !payload.appointment) {
        if (response.status === 409) {
          setSelectedSlot(null);
          setAvailabilityError("That time is no longer available. Refresh the available times and choose another slot.");
          setStep(2);
        }
        throw new Error(payload.error?.message || "The appointment could not be confirmed. Review your details and try again.");
      }
      setConfirmation(payload.appointment);
      setStep(4);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The appointment could not be confirmed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyGuestToken() {
    const token = confirmation?.guestManagementToken;
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setTokenCopied(true);
    } catch {
      setTokenCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#E2EBE8] bg-white shadow-[0_24px_70px_-38px_rgba(23,75,69,0.28)]">
      <div className="border-b border-[#E8EEED] bg-[#F8FAF9] px-5 py-6 sm:px-8"><ol aria-label="Booking steps" className="grid grid-cols-5 gap-2">{STEPS.map((label, index) => <li key={label} className="min-w-0 text-center"><span aria-current={step === index ? "step" : undefined} className={`mx-auto flex size-8 items-center justify-center rounded-full text-xs font-semibold ${step >= index ? "bg-[#176B67] text-white" : "bg-[#E7EEEB] text-[#71817D]"}`}>{step > index ? "✓" : index + 1}</span><span className={`mt-2 hidden text-[0.68rem] font-semibold sm:block ${step === index ? "text-[#176B67]" : "text-[#84938F]"}`}>{label}</span></li>)}</ol></div>
      <div className="p-5 sm:p-8 lg:p-10">
        {step === 0 ? <section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#52837D]">Step 1</p><h2 className="mt-2 text-2xl font-semibold text-[#243B3B]">Choose a specialty</h2><p className="mt-2 text-sm leading-6 text-[#71817D]">Select one of the active public specialties to find a bookable doctor.</p>{specialties.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{specialties.map((specialty) => <button key={specialty.id} type="button" onClick={() => chooseSpecialty(specialty.id)} aria-pressed={specialtyId === specialty.id} className={`min-h-24 rounded-2xl border p-5 text-left transition ${specialtyId === specialty.id ? "border-[#176B67] bg-[#EFF7F5] ring-1 ring-[#176B67]" : "border-[#E5ECEA] bg-white hover:border-[#B8D1CA]"}`}><span className="flex items-center justify-between gap-3"><span className="font-semibold text-[#2F4844]">{specialty.name}</span><PublicIcon name={specialtyId === specialty.id ? "check" : "chevron"} size={18} className="shrink-0 text-[#176B67]" /></span><span className="mt-2 block line-clamp-2 text-xs leading-5 text-[#82918D]">{specialty.description || "Explore doctors in this specialty."}</span></button>)}</div> : <p className="mt-6 rounded-2xl bg-[#F5F8F7] p-5 text-sm text-[#71817D]">No active public specialties are currently available.</p>}</section> : null}

        {step === 1 ? <section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#52837D]">Step 2</p><h2 className="mt-2 text-2xl font-semibold text-[#243B3B]">Choose a doctor</h2><p className="mt-2 text-sm leading-6 text-[#71817D]">Showing doctors who are publicly listed and currently configured for online booking in {selectedSpecialty?.name}.</p>{specialtyDoctors.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{specialtyDoctors.map((doctor) => <button key={doctor.id} type="button" onClick={() => chooseDoctor(doctor.id)} aria-pressed={doctorId === doctor.id} className={`rounded-2xl border p-5 text-left transition ${doctorId === doctor.id ? "border-[#176B67] bg-[#EFF7F5] ring-1 ring-[#176B67]" : "border-[#E5ECEA] bg-white hover:border-[#B8D1CA]"}`}><span className="flex items-start justify-between gap-3"><span><span className="block font-semibold text-[#2F4844]">{doctor.displayName}</span><span className="mt-1 block text-sm text-[#71817D]">{doctor.professionalTitle || "Medical doctor"}</span></span><PublicIcon name={doctorId === doctor.id ? "check" : "chevron"} size={18} className="shrink-0 text-[#176B67]" /></span></button>)}</div> : <p className="mt-6 rounded-2xl bg-[#F5F8F7] p-5 text-sm text-[#71817D]">No doctors in this specialty are currently bookable online. Choose another specialty or return later; public contact details are not configured in this demo.</p>}{selectedDoctor ? <label className="mt-6 block max-w-xl"><span className="mb-2 block text-sm font-semibold text-[#344B49]">Consultation service</span><select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="min-h-12 w-full rounded-xl border border-[#DDE7E4] bg-white px-3 text-sm text-[#344B49] outline-none focus:border-[#176B67]"><option value="">Select a service</option>{selectedDoctor.services.filter((service) => service.type === "CONSULTATION" || service.type === "FOLLOW_UP").map((service) => <option key={service.serviceId} value={service.serviceId}>{service.name} · {service.durationMinutes} min</option>)}</select></label> : null}</section> : null}

        {step === 2 ? <section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#52837D]">Step 3</p><h2 className="mt-2 text-2xl font-semibold text-[#243B3B]">Choose a date and time</h2><div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="block"><span className="mb-2 block text-sm font-semibold text-[#344B49]">Appointment date</span><input type="date" min={todayInCairo()} value={date} onChange={(event) => { setDate(event.target.value); setSlots([]); setSelectedSlot(null); setAvailabilityError(""); setAvailabilityChecked(false); }} className="min-h-12 w-full rounded-xl border border-[#DDE7E4] bg-white px-3 text-sm text-[#344B49] outline-none focus:border-[#176B67]" /></label><button type="button" disabled={!date || !selectedDoctor || !selectedService || availabilityLoading} onClick={loadAvailability} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#176B67] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{availabilityLoading ? "Checking times…" : "Find available times"} <PublicIcon name="calendar" size={17} /></button></div>{date ? <p className="mt-3 text-sm text-[#71817D]">{readableDate(date)} · Africa/Cairo</p> : null}{availabilityError ? <p role="alert" className="mt-4 rounded-xl border border-[#F1D6CC] bg-[#FFF8F5] p-4 text-sm text-[#9B513E]">{availabilityError}</p> : null}{availabilityLoading ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><span className="h-12 animate-pulse rounded-xl bg-[#EEF3F1]" /><span className="h-12 animate-pulse rounded-xl bg-[#EEF3F1]" /><span className="h-12 animate-pulse rounded-xl bg-[#EEF3F1]" /><span className="h-12 animate-pulse rounded-xl bg-[#EEF3F1]" /></div> : null}{!availabilityLoading && date && availabilityChecked && slots.length === 0 && !availabilityError ? <p className="mt-5 rounded-2xl bg-[#F5F8F7] p-5 text-sm text-[#71817D]">No available appointments were returned for this date. Choose another date or doctor.</p> : null}{slots.length ? <div className="mt-6"><h3 className="text-sm font-semibold text-[#344B49]">Available times</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{slots.map((slot) => <button key={slot.startsAt} type="button" onClick={() => setSelectedSlot(slot)} aria-pressed={selectedSlot?.startsAt === slot.startsAt} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition ${selectedSlot?.startsAt === slot.startsAt ? "border-[#176B67] bg-[#176B67] text-white" : "border-[#DDE7E4] bg-white text-[#45615B] hover:border-[#176B67]"}`}>{slot.startTime}</button>)}</div></div> : null}<p className="mt-5 text-xs leading-6 text-[#879590]">Availability is advisory until confirmation. The server rechecks the exact selected time during booking.</p></section> : null}

        {step === 3 ? <section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#52837D]">Step 4</p><h2 className="mt-2 text-2xl font-semibold text-[#243B3B]">Your details and review</h2><div className="mt-5 rounded-2xl bg-[#F5F8F7] p-4 text-sm text-[#526763]"><p><strong>{selectedSpecialty?.name}</strong> · {selectedDoctor?.displayName}</p><p className="mt-1">{selectedService?.name} · {date ? readableDate(date) : ""} · {selectedSlot?.startTime}</p></div><div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={() => chooseBookingMode("guest")} aria-pressed={mode === "guest"} className={`min-h-11 rounded-full px-5 text-sm font-semibold ${mode === "guest" ? "bg-[#176B67] text-white" : "border border-[#DDE7E4] text-[#526763]"}`}>Continue as guest</button><button type="button" onClick={() => void chooseBookingMode("account")} aria-pressed={mode === "account"} className={`min-h-11 rounded-full px-5 text-sm font-semibold ${mode === "account" ? "bg-[#176B67] text-white" : "border border-[#DDE7E4] text-[#526763]"}`}>Use patient account</button></div>{accountLoading ? <p className="mt-5 text-sm text-[#71817D]">Loading your permitted patient booking profiles…</p> : null}{accountError ? <div role="alert" className="mt-5 rounded-2xl border border-[#F1D6CC] bg-[#FFF8F5] p-4"><p className="text-sm text-[#9B513E]">{accountError}</p><Link href="/login" className="mt-3 inline-flex text-sm font-semibold text-[#176B67] underline">Sign in to your patient account</Link></div> : null}{mode === "guest" ? <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-[#344B49]">Full name</span><input autoComplete="name" value={guestName} onChange={(event) => setGuestName(event.target.value)} minLength={3} maxLength={180} required className="min-h-12 w-full rounded-xl border border-[#DDE7E4] px-4 text-sm outline-none focus:border-[#176B67]" placeholder="Enter your full name" /></label><label className="block"><span className="mb-2 block text-sm font-semibold text-[#344B49]">Phone number</span><input autoComplete="tel" inputMode="tel" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} minLength={7} maxLength={30} required className="min-h-12 w-full rounded-xl border border-[#DDE7E4] px-4 text-sm outline-none focus:border-[#176B67]" placeholder="Enter a contact number" /></label><label className="block"><span className="mb-2 block text-sm font-semibold text-[#344B49]">Email <span className="font-normal text-[#879590]">(optional)</span></span><input type="email" autoComplete="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} maxLength={254} className="min-h-12 w-full rounded-xl border border-[#DDE7E4] px-4 text-sm outline-none focus:border-[#176B67]" placeholder="name@example.com" /></label><p className="sm:col-span-2 text-xs leading-6 text-[#879590]">Guest details are used for this booking contact only. A guest booking does not create a patient record or medical file. No OTP is sent in this demonstration.</p></div> : <div className="mt-6">{patients.length ? <label className="block max-w-xl"><span className="mb-2 block text-sm font-semibold text-[#344B49]">Book for</span><select value={patientId} onChange={(event) => setPatientId(event.target.value)} className="min-h-12 w-full rounded-xl border border-[#DDE7E4] bg-white px-3 text-sm text-[#344B49] outline-none focus:border-[#176B67]">{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.displayName}{patient.isSelf ? " (Myself)" : ` (${patient.relationshipType || "Authorized patient"})`}</option>)}</select><span className="mt-2 block text-xs leading-6 text-[#879590]">Only your own active patient profile and currently authorized BOOK_APPOINTMENTS relationships are listed. Booking permission does not grant access to medical records.</span></label> : !accountLoading && !accountError ? <p className="text-sm text-[#71817D]">Select “Use patient account” to load your permitted profiles.</p> : null}</div>}{submitError ? <p role="alert" className="mt-5 rounded-xl border border-[#F1D6CC] bg-[#FFF8F5] p-4 text-sm text-[#9B513E]">{submitError}</p> : null}</section> : null}

        {step === 4 && confirmation ? <section aria-live="polite"><div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#E8F3EF] text-[#176B67]"><PublicIcon name="check" size={30} /></div><p className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#52837D]">Booking confirmed</p><h2 className="mt-2 text-center text-3xl font-semibold text-[#243B3B]">Your appointment is confirmed</h2><p className="mt-3 text-center text-sm leading-7 text-[#71817D]">The booking service has accepted your request. Keep the reference below for this demonstration.</p><div className="mx-auto mt-7 max-w-xl rounded-3xl border border-[#DCE8E3] bg-[#F8FAF9] p-6"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#82918D]">Booking reference</p><p className="mt-2 break-all text-2xl font-semibold tracking-[0.08em] text-[#176B67]">{confirmation.bookingReference}</p><div className="mt-6 grid gap-4 border-t border-[#E5ECEA] pt-5 sm:grid-cols-2"><div><p className="text-xs text-[#82918D]">Doctor</p><p className="mt-1 text-sm font-semibold text-[#344B49]">{confirmation.doctor.displayName}</p></div><div><p className="text-xs text-[#82918D]">Service</p><p className="mt-1 text-sm font-semibold text-[#344B49]">{confirmation.service.name}</p></div><div><p className="text-xs text-[#82918D]">Date</p><p className="mt-1 text-sm font-semibold text-[#344B49]">{readableDate(confirmation.localDate)}</p></div><div><p className="text-xs text-[#82918D]">Time</p><p className="mt-1 text-sm font-semibold text-[#344B49]">{confirmation.startTime} – {confirmation.endTime}</p></div><div><p className="text-xs text-[#82918D]">Duration</p><p className="mt-1 text-sm font-semibold text-[#344B49]">{confirmation.durationMinutes} minutes</p></div><div><p className="text-xs text-[#82918D]">Confirmed price</p><p className="mt-1 text-sm font-semibold text-[#344B49]">{confirmation.bookedPrice} {confirmation.currencyCode}</p></div></div></div>{confirmation.guestManagementToken ? <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#E8DAB8] bg-[#FFFBF1] p-5"><h3 className="font-semibold text-[#6F552A]">Save your one-time guest access token</h3><p className="mt-2 text-sm leading-6 text-[#826A3E]">This bearer token is shown once. Save it somewhere private; it is required for the guest self-service actions supported by this demo. Do not share it or place it in a URL.</p><code className="mt-4 block break-all rounded-xl border border-[#EFE3C9] bg-white p-3 text-xs text-[#4E4637]">{confirmation.guestManagementToken}</code><button type="button" onClick={() => void copyGuestToken()} className="mt-3 rounded-full border border-[#D8C59C] px-4 py-2 text-xs font-semibold text-[#6F552A]">{tokenCopied ? "Copied" : "Copy token"}</button></div> : null}<p className="mx-auto mt-6 max-w-xl text-center text-xs leading-6 text-[#879590]">MERUNO is a portfolio demonstration using synthetic data only. This is not a real clinic appointment.</p><div className="mt-7 flex justify-center"><Link href="/" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#176B67] px-6 text-sm font-semibold text-white">Return to home <PublicIcon name="arrow" size={16} /></Link></div></section> : null}

        {step < 4 ? <div className="mt-9 flex flex-col-reverse justify-between gap-3 border-t border-[#E8EEED] pt-6 sm:flex-row sm:items-center">{step > 0 ? <button type="button" onClick={() => { setSubmitError(""); setStep((current) => Math.max(0, current - 1)); }} className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#D5E2DE] px-5 text-sm font-semibold text-[#526763]">Back</button> : <span className="text-xs text-[#879590]">Secure server-side booking checks apply.</span>}{step === 3 ? <button type="button" disabled={!canContinue() || submitting || accountLoading} onClick={() => void submitBooking()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#176B67] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Confirming…" : "Confirm appointment"} <PublicIcon name="arrow" size={16} /></button> : <button type="button" disabled={!canContinue()} onClick={() => setStep((current) => Math.min(3, current + 1))} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#176B67] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Continue <PublicIcon name="arrow" size={16} /></button>}</div> : null}
      </div>
    </div>
  );
}
