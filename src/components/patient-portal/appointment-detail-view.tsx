"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatPortalDateTime, humanizePortalValue, todayInCairo } from "./portal-format";

type Slot = { startsAt: string; endsAt: string; startTime: string; endTime: string };
type Appointment = {
  id: string;
  bookingReference: string;
  status: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  doctorId: string;
  serviceId: string;
  doctor: { name: string; professionalTitle: string | null; specialty: string | null };
  service: { name: string };
  canCancel: boolean;
  canReschedule: boolean;
};

export function AppointmentDetailView({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [date, setDate] = useState(todayInCairo());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  const fetchAppointment = useCallback(async (): Promise<Appointment> => {
    const response = await fetch(`/api/patient/appointments/${encodeURIComponent(appointmentId)}`, { cache: "no-store" });
    const payload = await response.json() as { appointment?: Appointment; error?: { message?: string } };
    if (!response.ok || !payload.appointment) {
      throw new Error(payload.error?.message || "The appointment could not be loaded.");
    }
    return payload.appointment;
  }, [appointmentId]);

  const refreshAppointment = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setAppointment(await fetchAppointment());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The appointment could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchAppointment]);

  useEffect(() => {
    let isActive = true;

    fetchAppointment().then((loadedAppointment) => {
      if (!isActive) return;
      setAppointment(loadedAppointment);
      setIsLoading(false);
    }).catch((error: unknown) => {
      if (!isActive) return;
      setErrorMessage(error instanceof Error ? error.message : "The appointment could not be loaded.");
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [fetchAppointment]);

  async function cancelAppointment() {
    setIsMutating(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/patient/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "The appointment could not be cancelled.");
      setStatusMessage("Your appointment has been cancelled.");
      setShowCancelConfirmation(false);
      await refreshAppointment();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The appointment could not be cancelled.");
    } finally {
      setIsMutating(false);
    }
  }

  async function findAvailableTimes() {
    if (!appointment || !date) return;
    setIsCheckingAvailability(true);
    setErrorMessage(null);
    setSlots([]);
    setSelectedSlot(null);
    setAvailabilityChecked(false);
    try {
      const query = new URLSearchParams({ doctorId: appointment.doctorId, serviceId: appointment.serviceId, date });
      const response = await fetch(`/api/public/appointment-availability?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json() as { data?: { slots?: Slot[] }; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Available times could not be loaded. Try another date.");
      setSlots(Array.isArray(payload.data?.slots) ? payload.data.slots : []);
      setAvailabilityChecked(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Available times could not be loaded.");
    } finally {
      setIsCheckingAvailability(false);
    }
  }

  async function submitReschedule() {
    if (!selectedSlot) return;
    setIsMutating(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/patient/appointments/${encodeURIComponent(appointmentId)}/reschedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startsAt: selectedSlot.startsAt }),
        cache: "no-store",
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "The appointment could not be rescheduled.");
      setStatusMessage("Your appointment time has been updated.");
      setShowReschedule(false);
      setSlots([]);
      setSelectedSlot(null);
      await refreshAppointment();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The appointment could not be rescheduled.");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div><Link href="/portal/appointments" className="text-sm font-semibold text-[#176B67] hover:underline">← My appointments</Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Appointment details</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">Appointment</h1>
      </div>
      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}
      {statusMessage ? <p role="status" className="rounded-2xl border border-[#D2E7DC] bg-[#F0F8F3] p-4 text-sm font-medium text-[#34765E]">{statusMessage}</p> : null}
      {isLoading ? <div className="h-64 animate-pulse rounded-2xl bg-white" /> : null}
      {!isLoading && appointment ? (
        <>
          <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EEF2F0] pb-5">
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${appointment.status === "CONFIRMED" ? "bg-[#E9F5EF] text-[#34765E]" : appointment.status === "CANCELLED" ? "bg-[#FFF0ED] text-[#A15B4C]" : "bg-[#F0F3F1] text-[#667A73]"}`}>{humanizePortalValue(appointment.status)}</span>
                <h2 className="mt-3 text-xl font-semibold text-[#2D4943]">{appointment.doctor.name}</h2>
                <p className="mt-1 text-sm text-[#788982]">{appointment.doctor.professionalTitle || appointment.doctor.specialty || appointment.service.name}</p>
              </div>
              <div className="text-left sm:text-right"><p className="text-xs uppercase tracking-wide text-[#8A9993]">Booking reference</p><p className="mt-1 font-semibold text-[#46645B]">{appointment.bookingReference}</p></div>
            </div>
            <dl className="grid gap-5 pt-5 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Date and time</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{formatPortalDateTime(appointment.startsAt)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Expected duration</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{appointment.durationMinutes} minutes</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Specialty</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{appointment.doctor.specialty || "Not recorded"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Service</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{appointment.service.name}</dd></div>
            </dl>
          </section>

          {appointment.status === "CONFIRMED" ? (
            <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[#2D4943]">Manage this appointment</h2>
              <p className="mt-2 text-sm leading-6 text-[#74857F]">Self-service changes are available at least 24 hours before the scheduled start. The server rechecks eligibility and availability when you submit a change.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {appointment.canReschedule ? <button type="button" onClick={() => { setShowReschedule((value) => !value); setShowCancelConfirmation(false); }} className="min-h-11 rounded-xl bg-[#176B67] px-5 text-sm font-semibold text-white">{showReschedule ? "Close rescheduling" : "Reschedule"}</button> : null}
                {appointment.canCancel ? <button type="button" onClick={() => { setShowCancelConfirmation((value) => !value); setShowReschedule(false); }} className="min-h-11 rounded-xl border border-[#E8C9C0] px-5 text-sm font-semibold text-[#A15B4C] hover:bg-[#FFF8F5]">Cancel appointment</button> : null}
                {!appointment.canCancel && !appointment.canReschedule ? <p className="self-center text-sm text-[#8A716A]">The self-service window is closed. Contact Reception to request a later change.</p> : null}
              </div>

              {showCancelConfirmation ? <div className="mt-5 rounded-xl border border-[#F0D7CF] bg-[#FFF8F5] p-4">
                <p className="text-sm font-semibold text-[#8C5142]">Confirm cancellation?</p>
                <p className="mt-1 text-sm text-[#9B6A5E]">This will cancel the appointment. The change is recorded by the clinic system.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={cancelAppointment} disabled={isMutating} className="min-h-10 rounded-lg bg-[#A65C4A] px-4 text-sm font-semibold text-white disabled:opacity-60">{isMutating ? "Cancelling…" : "Confirm cancellation"}</button>
                  <button type="button" onClick={() => setShowCancelConfirmation(false)} className="min-h-10 rounded-lg border border-[#E8C9C0] px-4 text-sm font-semibold text-[#8C5142]">Keep appointment</button>
                </div>
              </div> : null}

              {showReschedule ? <div className="mt-5 rounded-xl border border-[#DCEAE5] bg-[#F7FAF8] p-4 sm:p-5">
                <h3 className="font-semibold text-[#36564E]">Choose a new time</h3>
                <p className="mt-1 text-sm leading-6 text-[#74857F]">The doctor and service remain the same. Choose a date, check live availability, then select one returned time.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <label className="block"><span className="mb-2 block text-sm font-medium text-[#48625A]">New appointment date</span><input type="date" min={todayInCairo()} value={date} onChange={(event) => { setDate(event.target.value); setSlots([]); setSelectedSlot(null); setAvailabilityChecked(false); }} className="min-h-11 w-full rounded-xl border border-[#D5E2DD] bg-white px-3 text-sm text-[#344B49] outline-none focus:border-[#176B67]" /></label>
                  <button type="button" onClick={findAvailableTimes} disabled={!date || isCheckingAvailability} className="min-h-11 rounded-xl bg-[#315F57] px-5 text-sm font-semibold text-white disabled:opacity-50">{isCheckingAvailability ? "Checking…" : "Find available times"}</button>
                </div>
                {slots.length ? <div className="mt-5"><p className="text-sm font-semibold text-[#48625A]">Available times · Africa/Cairo</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{slots.map((slot) => <button key={slot.startsAt} type="button" onClick={() => setSelectedSlot(slot)} aria-pressed={selectedSlot?.startsAt === slot.startsAt} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${selectedSlot?.startsAt === slot.startsAt ? "border-[#176B67] bg-[#176B67] text-white" : "border-[#D5E2DD] bg-white text-[#45615B] hover:border-[#176B67]"}`}>{slot.startTime}</button>)}</div><button type="button" onClick={submitReschedule} disabled={!selectedSlot || isMutating} className="mt-5 min-h-11 rounded-xl bg-[#176B67] px-5 text-sm font-semibold text-white disabled:opacity-50">{isMutating ? "Updating…" : "Confirm new time"}</button></div> : null}
                {!isCheckingAvailability && date && !availabilityChecked ? <p className="mt-4 text-sm text-[#7B8B85]">Check availability to see times returned for this date.</p> : null}
                {!isCheckingAvailability && availabilityChecked && slots.length === 0 ? <p className="mt-4 text-sm text-[#7B8B85]">No available times were returned for this date. Choose another date and check again.</p> : null}
              </div> : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
