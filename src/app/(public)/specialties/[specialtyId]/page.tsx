import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DoctorPortrait } from "@/components/public-site/doctor-portrait";
import { PublicIcon } from "@/components/public-site/public-icon";
import { PublicPageIntro } from "@/components/public-site/section-heading";
import { loadPublicClinicCatalog } from "@/server/public-site/public-catalog";

interface SpecialtyPageProps {
  params: Promise<{ specialtyId: string }>;
}

export async function generateMetadata({ params }: SpecialtyPageProps): Promise<Metadata> {
  const { specialtyId } = await params;
  const catalog = await loadPublicClinicCatalog();
  const specialty = catalog?.specialties.find((item) => item.id === specialtyId);
  return {
    title: specialty ? `${specialty.name} | MERUNO Medical Clinics` : "Specialty | MERUNO Medical Clinics",
    description: specialty?.description || "Explore an active MERUNO medical specialty.",
  };
}

export default async function SpecialtyDetailPage({ params }: SpecialtyPageProps) {
  const { specialtyId } = await params;
  const catalog = await loadPublicClinicCatalog();
  if (!catalog) {
    return <main id="main-content" className="mx-auto max-w-4xl px-5 py-24 text-center"><h1 className="text-3xl font-semibold text-[#243B3B]">Specialty information is temporarily unavailable</h1><p className="mt-4 text-[#71817D]">Please return to the specialties directory and try again later.</p><Link href="/specialties" className="mt-7 inline-flex min-h-11 items-center rounded-full bg-[#176B67] px-5 text-sm font-semibold text-white">Back to specialties</Link></main>;
  }
  const specialty = catalog.specialties.find((item) => item.id === specialtyId);
  if (!specialty) notFound();

  const doctors = catalog.doctors.filter((doctor) => doctor.specialties.some((item) => item.id === specialty.id));
  const serviceMap = new Map<string, (typeof doctors)[number]["services"][number]>();
  for (const doctor of doctors) {
    for (const service of doctor.services) {
      if (service.type === "CONSULTATION" || service.type === "FOLLOW_UP") {
        serviceMap.set(service.serviceId, service);
      }
    }
  }
  const services = Array.from(serviceMap.values());

  return (
    <main id="main-content" className="pb-20">
      <div className="mx-auto w-full max-w-7xl px-5 pt-8 sm:px-7 lg:px-8"><nav aria-label="Breadcrumb" className="text-sm text-[#82918D]"><Link href="/" className="hover:text-[#176B67]">Home</Link><span className="mx-2">/</span><Link href="/specialties" className="hover:text-[#176B67]">Specialties</Link><span className="mx-2">/</span><span className="text-[#526763]">{specialty.name}</span></nav></div>
      <PublicPageIntro eyebrow="Specialty details" title={specialty.name} description={specialty.description?.trim() || "Explore the public doctors and consultation services currently associated with this specialty."} />
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:px-7 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-16">
        <aside className="h-fit rounded-3xl bg-[#EAF3F1] p-7 sm:p-8">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white text-[#176B67]"><PublicIcon name="stethoscope" size={26} /></div>
          <h2 className="mt-6 text-xl font-semibold text-[#243B3B]">Explore care in {specialty.name}</h2>
          <p className="mt-3 text-sm leading-7 text-[#657875]">The information on this page reflects the active public clinic catalogue. Appointment choices are confirmed against live availability by the booking service.</p>
          <Link href={`/book-appointment?specialtyId=${encodeURIComponent(specialty.id)}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#176B67] px-5 text-sm font-semibold text-white transition hover:bg-[#125A56]">Book an appointment <PublicIcon name="arrow" size={16} /></Link>
        </aside>
        <div className="space-y-8">
          <section>
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#52837D]">Public directory</p><h2 className="mt-2 text-2xl font-semibold text-[#243B3B]">Doctors in this specialty</h2></div><Link href="/doctors" className="text-sm font-semibold text-[#176B67] hover:text-[#104F4B]">All doctors</Link></div>
            {doctors.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {doctors.map((doctor) => {
                  const doctorName = doctor.displayName ?? "Doctor";
                  const profileHref = `/doctors/${encodeURIComponent(doctor.id)}`;
                  return (
                    <article key={doctor.id} data-testid="specialty-doctor-card" className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E5ECEA] bg-white transition hover:-translate-y-1 hover:border-[#B8D1CA] hover:shadow-lg hover:shadow-[#173D39]/5">
                      <Link href={profileHref} aria-label={`View ${doctorName} profile`} className="flex min-w-0 flex-1 flex-col rounded-t-2xl focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#176B67]">
                        <DoctorPortrait doctorId={doctor.id} displayName={doctorName} className="h-48 w-full shrink-0" sizes="(max-width: 640px) 100vw, 360px" />
                        <div className="min-w-0 p-5">
                          <h3 className="break-words font-semibold text-[#243B3B]">{doctorName}</h3>
                          <p className="mt-1 break-words text-sm text-[#71817D]">{doctor.professionalTitle || specialty.name}</p>
                          {doctor.bio ? <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-[#71817D]">{doctor.bio}</p> : null}
                        </div>
                      </Link>
                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#EDF1F0] px-5 py-4">
                        <Link href={profileHref} className="inline-flex min-w-0 flex-1 items-center gap-1 text-sm font-semibold text-[#176B67]">View profile <PublicIcon name="arrow" size={14} /></Link>
                        {doctor.isBookable ? <Link href={`/book-appointment?doctorId=${encodeURIComponent(doctor.id)}`} className="shrink-0 rounded-full bg-[#EAF3F1] px-4 py-2 text-xs font-semibold text-[#176B67] transition hover:bg-[#176B67] hover:text-white">Book</Link> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <p className="mt-5 rounded-2xl border border-dashed border-[#CFDCD8] bg-white p-6 text-sm text-[#71817D]">No public doctor profiles are currently associated with this specialty.</p>}
          </section>
          <section><h2 className="text-2xl font-semibold text-[#243B3B]">Related consultation services</h2>{services.length ? <ul className="mt-5 grid gap-3 sm:grid-cols-2">{services.map((service) => <li key={service.serviceId} className="flex items-center gap-3 rounded-2xl border border-[#E5ECEA] bg-white p-4 text-sm font-medium text-[#526763]"><span className="flex size-9 items-center justify-center rounded-xl bg-[#EAF3F1] text-[#176B67]"><PublicIcon name="clipboard" size={17} /></span>{service.name}</li>)}</ul> : <p className="mt-4 text-sm text-[#71817D]">No active public consultation services are listed for this specialty.</p>}</section>
        </div>
      </section>
    </main>
  );
}
