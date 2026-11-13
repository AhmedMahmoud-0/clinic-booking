import type { Metadata } from "next";

import { AppointmentBookingFlow } from "@/components/public-site/appointment-booking-flow";
import { PublicPageIntro } from "@/components/public-site/section-heading";
import { loadPublicClinicCatalog } from "@/server/public-site/public-catalog";

export const metadata: Metadata = { title: "Book an Appointment | MERUNO Medical Clinics", description: "Choose a specialty, doctor, and currently available appointment time in the MERUNO booking demonstration." };

interface BookingPageProps { searchParams: Promise<{ specialtyId?: string; doctorId?: string }> }

export default async function BookAppointmentPage({ searchParams }: BookingPageProps) {
  const [catalog, params] = await Promise.all([loadPublicClinicCatalog(), searchParams]);
  return <main id="main-content" className="pb-20"><PublicPageIntro eyebrow="Appointment booking" title="Book an appointment" description="Follow the five steps to select a specialty, doctor, available time, and booking details. Times are checked again by the server when you confirm." />{catalog ? <section className="mx-auto max-w-6xl px-5 py-10 sm:px-7 lg:px-8 lg:py-14"><AppointmentBookingFlow specialties={catalog.specialties} doctors={catalog.doctors} initialSpecialtyId={params.specialtyId ?? null} initialDoctorId={params.doctorId ?? null} /></section> : <section className="mx-auto max-w-4xl px-5 py-14 text-center"><div className="rounded-3xl border border-[#E5ECEA] bg-white p-8"><h2 className="text-xl font-semibold text-[#243B3B]">Booking is temporarily unavailable</h2><p className="mt-3 text-sm leading-7 text-[#71817D]">The public clinic catalogue could not be loaded. Please try again later.</p></div></section>}</main>;
}
