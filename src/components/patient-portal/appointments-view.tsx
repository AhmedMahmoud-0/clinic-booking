"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPortalDateTime, humanizePortalValue } from "./portal-format";

type Appointment = {
  id: string;
  bookingReference: string;
  status: string;
  startsAt: string;
  endsAt: string;
  doctor: { name: string; professionalTitle: string | null; specialty: string | null };
  service: { name: string };
};

type View = "UPCOMING" | "PAST" | "CANCELLED";
const VIEWS: { value: View; label: string }[] = [
  { value: "UPCOMING", label: "Upcoming" },
  { value: "PAST", label: "Past" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function AppointmentsView() {
  const [view, setView] = useState<View>("UPCOMING");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(`/api/patient/appointments?view=${view}`, { cache: "no-store" });
        const payload = await response.json() as { appointments?: Appointment[]; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message || "Appointments could not be loaded.");
        if (active) setAppointments(Array.isArray(payload.appointments) ? payload.appointments : []);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Appointments could not be loaded.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [view]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Appointments</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">My appointments</h1>
        <p className="mt-2 text-sm leading-6 text-[#74857F]">Review your upcoming, past, and cancelled appointments.</p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Appointment categories">
        {VIEWS.map((item) => (
          <button key={item.value} type="button" role="tab" aria-selected={view === item.value} onClick={() => setView(item.value)} className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition ${view === item.value ? "bg-[#176B67] text-white" : "border border-[#DCE7E3] bg-white text-[#597069] hover:border-[#8EB5A9]"}`}>
            {item.label}
          </button>
        ))}
      </div>

      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}
      {isLoading ? <div className="grid gap-4"><div className="h-36 animate-pulse rounded-2xl bg-white" /><div className="h-36 animate-pulse rounded-2xl bg-white" /></div> : null}
      {!isLoading && !errorMessage && appointments.length === 0 ? (
        <section className="rounded-2xl border border-[#E3ECE8] bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-[#334D47]">No {view.toLowerCase()} appointments</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7B8B85]">There are no appointments in this section for your patient account.</p>
          {view === "UPCOMING" ? <Link href="/book-appointment" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#176B67] px-5 text-sm font-semibold text-white">Book an appointment</Link> : null}
        </section>
      ) : null}

      <div className="grid gap-4">
        {appointments.map((appointment) => (
          <article key={appointment.id} className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-[#2D4943]">{appointment.doctor.name}</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${appointment.status === "CONFIRMED" ? "bg-[#E9F5EF] text-[#34765E]" : appointment.status === "CANCELLED" ? "bg-[#FFF0ED] text-[#A15B4C]" : "bg-[#F0F3F1] text-[#667A73]"}`}>{humanizePortalValue(appointment.status)}</span>
                </div>
                <p className="mt-1 text-sm text-[#788982]">{appointment.doctor.specialty || appointment.service.name}</p>
                <p className="mt-3 text-sm font-medium text-[#526A62]">{formatPortalDateTime(appointment.startsAt)}</p>
                <p className="mt-1 text-xs text-[#8A9993]">Booking reference: {appointment.bookingReference}</p>
              </div>
              <Link href={`/portal/appointments/${encodeURIComponent(appointment.id)}`} className="inline-flex min-h-10 items-center rounded-xl border border-[#C9DDD6] px-4 text-sm font-semibold text-[#176B67] hover:bg-[#F0F7F4]">Appointment details</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
