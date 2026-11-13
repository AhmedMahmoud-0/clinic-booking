import type { Metadata } from "next";

import { DoctorDirectory } from "@/components/public-site/doctor-directory";
import { PublicPageIntro } from "@/components/public-site/section-heading";
import { loadPublicClinicCatalog } from "@/server/public-site/public-catalog";

export const metadata: Metadata = {
  title: "Our Doctors | MERUNO Medical Clinics",
  description: "Explore the public doctor profiles currently configured in the MERUNO clinic catalogue.",
};

export default async function DoctorsPage() {
  const catalog = await loadPublicClinicCatalog();
  return (
    <main id="main-content" className="pb-20">
      <PublicPageIntro eyebrow="Meet the team" title="Our doctors" description="Explore the public professional profiles currently available in the MERUNO clinic catalogue. Profile details are shown only when they have been configured for public display." />
      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-7 lg:px-8 lg:py-16">
        {catalog === null ? <div className="rounded-3xl border border-[#E5ECEA] bg-white p-8 text-center"><h2 className="text-xl font-semibold text-[#243B3B]">The doctor directory is temporarily unavailable</h2><p className="mt-3 text-sm text-[#71817D]">Please try again later.</p></div> : <DoctorDirectory doctors={catalog.doctors} specialties={catalog.specialties} />}
      </section>
    </main>
  );
}
