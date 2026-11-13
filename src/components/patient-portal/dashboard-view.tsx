"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPortalDateTime } from "./portal-format";

type Appointment = {
  id: string;
  bookingReference: string;
  startsAt: string;
  endsAt: string;
  status: string;
  doctor: { name: string; professionalTitle: string | null; specialty: string | null };
  service: { name: string };
};

type Dashboard = {
  patientName: string;
  counts: { upcomingAppointments: number; completedVisits: number; cancelledAppointments: number };
  nextAppointments: Appointment[];
};

export function DashboardView() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/patient/portal/dashboard", { cache: "no-store" });
        const payload = await response.json() as { dashboard?: Dashboard; error?: { message?: string } };
        if (!response.ok || !payload.dashboard) throw new Error(payload.error?.message || "Your dashboard could not be loaded.");
        if (active) setDashboard(payload.dashboard);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Your dashboard could not be loaded.");
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
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Overview</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">{dashboard ? `Welcome, ${dashboard.patientName}` : "Patient dashboard"}</h1>
        <p className="mt-2 text-sm leading-6 text-[#74857F]">A private view of your appointments and completed visits.</p>
      </header>

      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}

      <section aria-label="Patient summary" className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Upcoming appointments", value: dashboard?.counts.upcomingAppointments },
          { label: "Completed visits", value: dashboard?.counts.completedVisits },
          { label: "Cancelled appointments", value: dashboard?.counts.cancelledAppointments },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#E3ECE8] bg-white p-5">
            <p className="text-sm text-[#758680]">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-[#24504A]">{isLoading ? "—" : item.value ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#2D4742]">Upcoming appointments</h2>
            <p className="mt-1 text-sm text-[#7B8B85]">Your next confirmed appointments.</p>
          </div>
          <Link href="/portal/appointments" className="text-sm font-semibold text-[#176B67] hover:underline">View all appointments</Link>
        </div>
        {isLoading ? <div className="mt-5 h-24 animate-pulse rounded-xl bg-[#F2F6F4]" /> : null}
        {!isLoading && dashboard?.nextAppointments.length === 0 ? (
          <div className="mt-5 rounded-xl bg-[#F5F8F7] p-5">
            <p className="font-medium text-[#425C55]">No upcoming appointments</p>
            <p className="mt-1 text-sm text-[#7B8B85]">When you book an appointment, its confirmed details will appear here.</p>
            <Link href="/book-appointment" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white">Book an appointment</Link>
          </div>
        ) : null}
        <div className="mt-5 divide-y divide-[#EEF2F0]">
          {dashboard?.nextAppointments.map((appointment) => (
            <article key={appointment.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-semibold text-[#334D47]">{appointment.doctor.name}</p>
                <p className="mt-1 text-sm text-[#788982]">{appointment.doctor.specialty || appointment.service.name}</p>
                <p className="mt-2 text-sm text-[#5E746C]">{formatPortalDateTime(appointment.startsAt)}</p>
              </div>
              <Link href={`/portal/appointments/${encodeURIComponent(appointment.id)}`} className="inline-flex min-h-10 items-center rounded-xl border border-[#C9DDD6] px-4 text-sm font-semibold text-[#176B67] hover:bg-[#F0F7F4]">View details</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#DCEAE5] bg-[#EDF6F2] p-5 sm:p-6">
        <h2 className="font-semibold text-[#31534B]">Your information stays within your access scope</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#647C73]">Family access is limited to verified, active delegation permissions. Appointment-booking permission alone does not grant access to another patient’s medical record.</p>
        <Link href="/portal/family" className="mt-3 inline-flex text-sm font-semibold text-[#176B67] hover:underline">Review family access</Link>
      </section>
    </div>
  );
}
