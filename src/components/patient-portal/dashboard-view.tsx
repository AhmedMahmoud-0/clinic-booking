"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPortalDate, formatPortalDateTime } from "./portal-format";

type Appointment = {
  id: string;
  bookingReference: string;
  startsAt: string;
  endsAt: string;
  status: string;
  doctor: { name: string; professionalTitle: string | null; specialty: string | null };
  service: { name: string };
};

type RecentVisit = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  doctor: { name: string; specialty: string | null };
};

type Dashboard = {
  patientName: string;
  counts: {
    upcomingAppointments: number;
    completedVisits: number;
    cancelledAppointments: number;
    issuedPrescriptions: number;
    releasedLabResults: number;
    releasedRadiologyReports: number;
  };
  nextAppointments: Appointment[];
  recentVisits: RecentVisit[];
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

  const summary = [
    { label: "Upcoming appointments", value: dashboard?.counts.upcomingAppointments, href: "/portal/appointments" },
    { label: "Completed visits", value: dashboard?.counts.completedVisits, href: "/portal/visits" },
    { label: "Prescriptions", value: dashboard?.counts.issuedPrescriptions, href: "/portal/records" },
    { label: "Lab results", value: dashboard?.counts.releasedLabResults, href: "/portal/records" },
    { label: "Radiology reports", value: dashboard?.counts.releasedRadiologyReports, href: "/portal/records" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Overview</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">{dashboard ? `Welcome, ${dashboard.patientName}` : "Patient dashboard"}</h1>
        <p className="mt-2 text-sm leading-6 text-[#74857F]">Manage your appointments and review the patient information released to your account.</p>
      </header>

      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}

      <section aria-label="Patient summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {summary.map((item) => (
          <Link key={item.label} href={item.href} className="min-w-0 rounded-2xl border border-[#E3ECE8] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#BFD9D0] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B67] sm:p-5">
            <p className="min-h-10 text-sm leading-5 text-[#758680]">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-[#24504A]">{isLoading || !dashboard ? "—" : item.value ?? 0}</p>
          </Link>
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

      <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#2D4742]">Recent visits</h2>
            <p className="mt-1 text-sm text-[#7B8B85]">Completed appointments linked to your patient record.</p>
          </div>
          <Link href="/portal/visits" className="text-sm font-semibold text-[#176B67] hover:underline">View visit history</Link>
        </div>
        {isLoading ? <div className="mt-5 h-20 animate-pulse rounded-xl bg-[#F2F6F4]" /> : null}
        {!isLoading && dashboard?.recentVisits.length === 0 ? <p className="mt-5 rounded-xl bg-[#F5F8F7] p-4 text-sm text-[#788982]">Completed visits will appear here after they are recorded by the clinic.</p> : null}
        <div className="mt-4 divide-y divide-[#EEF2F0]">
          {dashboard?.recentVisits.map((visit) => (
            <article key={visit.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-semibold text-[#334D47]">{visit.doctor.name}</p>
                <p className="mt-1 text-sm text-[#788982]">{visit.doctor.specialty || "Completed visit"} · {formatPortalDate(visit.completedAt || visit.startedAt)}</p>
              </div>
              <Link href={`/portal/visits/${encodeURIComponent(visit.id)}`} className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-[#176B67] hover:bg-[#F0F7F4]">View visit</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#DCEAE5] bg-[#EDF6F2] p-5 sm:p-6">
        <h2 className="font-semibold text-[#31534B]">Quick links</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/portal/records", label: "Medical records" },
            { href: "/portal/billing", label: "Invoices & receipts" },
            { href: "/portal/complaints", label: "Complaints" },
            { href: "/portal/notifications", label: "Notifications" },
            { href: "/portal/family", label: "Family & access" },
          ].map((item) => <Link key={item.href} href={item.href} className="flex min-h-11 items-center justify-between rounded-xl border border-[#D4E6DF] bg-white/80 px-4 text-sm font-semibold text-[#3E6258] transition hover:bg-white hover:text-[#176B67]">{item.label}<span aria-hidden="true">→</span></Link>)}
        </div>
        <p className="mt-4 text-sm leading-6 text-[#647C73]">Family access is limited to verified, active delegation permissions. Appointment-booking permission alone does not grant access to another patient’s medical record.</p>
      </section>
    </div>
  );
}
