import type { Metadata } from "next";
import Link from "next/link";

import { PublicIcon } from "@/components/public-site/public-icon";
import { PublicPageIntro } from "@/components/public-site/section-heading";
import { loadPublicClinicCatalog } from "@/server/public-site/public-catalog";

export const metadata: Metadata = {
  title: "Medical Specialties | MERUNO Medical Clinics",
  description: "Explore the active medical specialties listed in the MERUNO outpatient clinic catalogue.",
};

export default async function SpecialtiesPage() {
  const catalog = await loadPublicClinicCatalog();

  return (
    <main id="main-content" className="pb-20">
      <PublicPageIntro
        eyebrow="Explore care areas"
        title="Our medical specialties"
        description="Browse the specialties currently configured for the MERUNO outpatient clinic. Each listing is based on the active public clinic catalogue."
      />
      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-7 lg:px-8 lg:py-16">
        {catalog === null ? (
          <div className="rounded-3xl border border-[#E5ECEA] bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-[#243B3B]">The specialty catalogue is temporarily unavailable</h2>
            <p className="mt-3 text-sm leading-7 text-[#71817D]">Please try again later or return to the main website.</p>
            <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#176B67] px-5 text-sm font-semibold text-white">Return home</Link>
          </div>
        ) : catalog.specialties.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#CFDCD8] bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-[#243B3B]">No public specialties are listed yet</h2>
            <p className="mt-3 text-sm text-[#71817D]">Please check back when the clinic catalogue has been configured.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {catalog.specialties.map((specialty, index) => {
              const doctorCount = catalog.doctors.filter((doctor) => doctor.specialties.some((item) => item.id === specialty.id)).length;
              return (
                <Link
                  key={specialty.id}
                  href={`/specialties/${encodeURIComponent(specialty.id)}`}
                  data-testid="specialty-card-link"
                  aria-label={`Explore ${specialty.name} specialty and doctors`}
                  className="group flex min-h-64 cursor-pointer flex-col rounded-3xl border border-[#E4ECE9] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#B8D1CA] hover:shadow-xl hover:shadow-[#173D39]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176B67]"
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF3F1] text-[#176B67]">
                    <PublicIcon name="stethoscope" size={22} />
                  </div>
                  <p className="mt-6 text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-[#82918D]">Specialty {String(index + 1).padStart(2, "0")}</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#243B3B]">{specialty.name}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#71817D]">{specialty.description?.trim() || "Explore the doctors and consultation services currently associated with this specialty."}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#EDF1F0] pt-5">
                    <span className="text-xs text-[#82918D]">{doctorCount} public {doctorCount === 1 ? "doctor" : "doctors"}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#176B67] transition-colors group-hover:text-[#104F4B]">
                      Explore <PublicIcon name="arrow" size={15} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
