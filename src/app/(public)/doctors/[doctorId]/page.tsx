import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DoctorPortrait } from "@/components/public-site/doctor-portrait";
import { PublicIcon } from "@/components/public-site/public-icon";
import { PublicPageIntro } from "@/components/public-site/section-heading";
import { loadPublicClinicCatalog } from "@/server/public-site/public-catalog";

interface DoctorPageProps { params: Promise<{ doctorId: string }> }

export async function generateMetadata({ params }: DoctorPageProps): Promise<Metadata> {
  const { doctorId } = await params;
  const catalog = await loadPublicClinicCatalog();
  const doctor = catalog?.doctors.find((item) => item.id === doctorId);
  return { title: doctor ? `${doctor.displayName ?? "Doctor"} | MERUNO Medical Clinics` : "Doctor Profile | MERUNO Medical Clinics", description: doctor?.bio || "Public doctor profile at MERUNO Medical Clinics." };
}

export default async function DoctorProfilePage({ params }: DoctorPageProps) {
  const { doctorId } = await params;
  const catalog = await loadPublicClinicCatalog();
  if (!catalog) return <main id="main-content" className="mx-auto max-w-4xl px-5 py-24 text-center"><h1 className="text-3xl font-semibold text-[#243B3B]">Doctor information is temporarily unavailable</h1><p className="mt-4 text-[#71817D]">Please return to the doctor directory and try again later.</p><Link href="/doctors" className="mt-7 inline-flex min-h-11 items-center rounded-full bg-[#176B67] px-5 text-sm font-semibold text-white">Back to doctors</Link></main>;
  const doctor = catalog.doctors.find((item) => item.id === doctorId);
  if (!doctor) notFound();
  const doctorName = doctor.displayName ?? "Doctor";
  const consultationServices = doctor.services.filter((item) => item.type === "CONSULTATION" || item.type === "FOLLOW_UP");

  return (
    <main id="main-content" className="pb-20">
      <div className="mx-auto w-full max-w-7xl px-5 pt-8 sm:px-7 lg:px-8"><nav aria-label="Breadcrumb" className="text-sm text-[#82918D]"><Link href="/" className="hover:text-[#176B67]">Home</Link><span className="mx-2">/</span><Link href="/doctors" className="hover:text-[#176B67]">Doctors</Link><span className="mx-2">/</span><span className="text-[#526763]">{doctorName}</span></nav></div>
      <PublicPageIntro eyebrow="Doctor profile" title={doctorName} description={doctor.professionalTitle || "MERUNO public doctor profile"} />
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:px-7 lg:grid-cols-[0.72fr_1.28fr] lg:px-8 lg:py-16">
        <aside className="h-fit overflow-hidden rounded-3xl border border-[#E5ECEA] bg-white text-center shadow-sm">
          <DoctorPortrait doctorId={doctor.id} displayName={doctorName} className="h-80 w-full" sizes="(max-width: 1024px) 100vw, 440px" />
          <div className="p-7">
            <h2 className="text-xl font-semibold text-[#243B3B]">{doctorName}</h2>
            <p className="mt-2 text-sm text-[#71817D]">{doctor.professionalTitle || "Medical doctor"}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">{doctor.specialties.map((item) => <Link key={item.id} href={`/specialties/${encodeURIComponent(item.id)}`} className="rounded-full bg-[#F1F6F4] px-3 py-1.5 text-xs font-medium text-[#56716B] hover:bg-[#E5F0EC]">{item.name}</Link>)}</div>
            {doctor.isBookable ? <Link href={`/book-appointment?doctorId=${encodeURIComponent(doctor.id)}`} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#176B67] px-5 text-sm font-semibold text-white hover:bg-[#125A56]">Book an appointment <PublicIcon name="arrow" size={16} /></Link> : <p className="mt-6 rounded-xl bg-[#F5F8F7] p-3 text-xs text-[#71817D]">Online booking is not currently available for this profile.</p>}
          </div>
        </aside>
        <div className="space-y-7"><section className="rounded-3xl border border-[#E5ECEA] bg-white p-7 sm:p-8"><h2 className="text-2xl font-semibold text-[#243B3B]">About the doctor</h2>{doctor.bio ? <p className="mt-4 whitespace-pre-line text-sm leading-8 text-[#657875]">{doctor.bio}</p> : <p className="mt-4 text-sm leading-7 text-[#71817D]">A public biography has not been provided for this profile.</p>}{typeof doctor.yearsOfExperience === "number" && doctor.yearsOfExperience > 0 ? <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#EAF3F1] px-4 py-2 text-sm font-medium text-[#486A64]"><PublicIcon name="check" size={15} /> {doctor.yearsOfExperience} years of experience (as configured)</div> : null}</section><section className="rounded-3xl border border-[#E5ECEA] bg-white p-7 sm:p-8"><h2 className="text-2xl font-semibold text-[#243B3B]">Consultation services</h2>{consultationServices.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{consultationServices.map((service) => <div key={service.serviceId} className="rounded-2xl bg-[#F5F8F7] p-4"><p className="font-semibold text-[#344B49]">{service.name}</p><p className="mt-1 text-xs text-[#82918D]">{service.durationMinutes} minutes</p></div>)}</div> : <p className="mt-4 text-sm text-[#71817D]">No public consultation services are currently listed for this doctor.</p>}</section><p className="text-xs leading-6 text-[#879590]">Profile information is limited to approved public catalogue fields. Ratings, patient counts, qualifications, and schedule claims are not displayed unless a supported source is available.</p></div>
      </section>
    </main>
  );
}
