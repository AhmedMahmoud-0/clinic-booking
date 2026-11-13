import type { Metadata } from "next";
import Link from "next/link";

import { PublicIcon } from "@/components/public-site/public-icon";
import { PublicPageIntro, SectionHeading } from "@/components/public-site/section-heading";
import {
  getPublicConsultationServices,
  loadPublicClinicCatalog,
} from "@/server/public-site/public-catalog";

export const metadata: Metadata = {
  title: "Clinic Services | MERUNO Medical Clinics",
  description:
    "Explore outpatient consultations, internal laboratory services, and Digital X-ray and Ultrasound at MERUNO.",
};

const serviceAreas = [
  {
    id: "consultations",
    icon: "stethoscope" as const,
    eyebrow: "Outpatient care",
    title: "Specialist consultations",
    description:
      "Consultation services are organized around the clinic’s active specialties and publicly listed doctors.",
  },
  {
    id: "laboratory",
    icon: "flask" as const,
    eyebrow: "Internal diagnostics",
    title: "Laboratory services",
    description:
      "The approved clinic model includes a medium-sized internal laboratory for its planned routine diagnostic services.",
  },
  {
    id: "imaging",
    icon: "scan" as const,
    eyebrow: "Diagnostic imaging",
    title: "Digital X-ray & Ultrasound",
    description:
      "The initial imaging scope is deliberately focused on Digital X-ray and Ultrasound.",
  },
];

export default async function ServicesPage() {
  const catalog = await loadPublicClinicCatalog();
  const consultationServices = catalog ? getPublicConsultationServices(catalog) : [];

  return (
    <main id="main-content">
      <PublicPageIntro
        eyebrow="Clinic services"
        title="The services included in the MERUNO clinic model."
        description="Explore the main outpatient and diagnostic service areas represented in this portfolio demonstration. The list stays within the approved clinic scope."
      />

      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-7 lg:px-8">
          <SectionHeading
            eyebrow="Service areas"
            title="Three connected areas of outpatient care."
            description="The clinic catalogue and service boundaries are based on the approved MERUNO project scope."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {serviceAreas.map((service, index) => (
              <article
                key={service.id}
                id={service.id}
                className="scroll-mt-28 rounded-[1.7rem] border border-[#E3EBE8] bg-white p-6 shadow-sm shadow-[#173D39]/[0.02] sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-13 items-center justify-center rounded-2xl bg-[#EAF3F1] text-[#176B67]">
                    <PublicIcon name={service.icon} size={24} />
                  </span>
                  <span className="text-xs font-semibold tracking-[0.16em] text-[#9AA9A5]">
                    0{index + 1}
                  </span>
                </div>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-[#6F928B]">
                  {service.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#2A4541]">
                  {service.title}
                </h2>
                <p className="mt-4 min-h-20 text-sm leading-7 text-[#71827E]">
                  {service.description}
                </p>

                {service.id === "consultations" ? (
                  <div className="mt-6 border-t border-[#E8EEED] pt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C8D89]">
                      Active public consultation services
                    </h3>
                    {consultationServices.length > 0 ? (
                      <ul className="mt-4 space-y-3">
                        {consultationServices.slice(0, 5).map((item) => (
                          <li key={item.serviceId} className="flex items-start gap-2.5 text-sm text-[#526763]">
                            <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#E7F2EF] text-[#176B67]">
                              <PublicIcon name="check" size={11} />
                            </span>
                            <span>{item.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-[#82918D]">
                        {catalog
                          ? "No active public consultation services are currently listed."
                          : "The consultation catalogue is temporarily unavailable."}
                      </p>
                    )}
                  </div>
                ) : null}

                {service.id === "imaging" ? (
                  <div className="mt-6 flex flex-wrap gap-2 border-t border-[#E8EEED] pt-5">
                    <span className="rounded-full bg-[#F1F6F4] px-3 py-2 text-xs font-semibold text-[#486A64]">
                      Digital X-ray
                    </span>
                    <span className="rounded-full bg-[#F1F6F4] px-3 py-2 text-xs font-semibold text-[#486A64]">
                      Ultrasound
                    </span>
                  </div>
                ) : null}

                {service.id === "laboratory" ? (
                  <div className="mt-6 border-t border-[#E8EEED] pt-5">
                    <p className="text-xs leading-6 text-[#82918D]">
                      Specific test availability is managed through the clinic’s configured catalogue.
                    </p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F8F7] py-14 sm:py-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 sm:px-7 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6F928B]">
              Patient access
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#243B3B]">
              Already have a MERUNO patient account?
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#758681]">
              Sign in to access the patient-facing features available to your account.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-[#176B67] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#125A56]"
          >
            Patient portal
            <PublicIcon name="arrow" size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
