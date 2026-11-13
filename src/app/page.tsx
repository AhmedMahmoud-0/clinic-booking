import type { Metadata } from "next";
import Link from "next/link";

import { PublicIcon } from "@/components/public-site/public-icon";
import { PublicSiteLayout } from "@/components/public-site/public-site-layout";
import { SectionHeading } from "@/components/public-site/section-heading";
import { loadPublicClinicCatalog } from "@/server/public-site/public-catalog";

export const metadata: Metadata = {
  title: "MERUNO Medical Clinics | Clearer Outpatient Care",
  description:
    "Explore MERUNO Medical Clinics, its specialties, outpatient services, and patient-facing digital experience.",
};

const serviceHighlights = [
  {
    icon: "stethoscope" as const,
    title: "Specialist consultations",
    description:
      "Explore outpatient consultations across the clinic’s active medical specialties.",
    href: "/services#consultations",
  },
  {
    icon: "flask" as const,
    title: "Internal laboratory",
    description:
      "A medium-sized internal laboratory is part of the approved MERUNO clinic scope.",
    href: "/services#laboratory",
  },
  {
    icon: "scan" as const,
    title: "Diagnostic imaging",
    description:
      "The imaging scope is focused on Digital X-ray and Ultrasound.",
    href: "/services#imaging",
  },
];

export default async function HomePage() {
  const catalog = await loadPublicClinicCatalog();
  const specialties = catalog?.specialties ?? [];
  const doctorCount = catalog?.doctors.length;

  return (
    <PublicSiteLayout>
      <main id="main-content">
      <section className="relative isolate overflow-hidden bg-[#F5F8F7]">
        <div className="pointer-events-none absolute -right-40 -top-40 -z-10 size-[34rem] rounded-full bg-[#DDEDEA] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-44 left-[-10rem] -z-10 size-[28rem] rounded-full bg-white blur-3xl" />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-7 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#CFE0DC] bg-white/80 px-3.5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-[#41736D] shadow-sm">
              <span className="size-1.5 rounded-full bg-[#176B67]" />
              Multi-specialty outpatient clinic
            </span>

            <h1 className="mt-7 text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-[#243B3B] sm:text-6xl lg:text-[4.35rem]">
              A clearer path to
              <span className="block text-[#176B67]">outpatient care.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-[#657875] sm:text-lg sm:leading-9">
              Explore the clinic’s specialties, understand the services within its
              scope, and find the next step for arranging a visit—all in one
              considered digital experience.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/book-appointment"
                data-testid="home-book-appointment"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#176B67] px-6 text-sm font-semibold text-white shadow-lg shadow-[#176B67]/15 transition hover:-translate-y-0.5 hover:bg-[#125A56] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B67]"
              >
                Book an appointment
                <PublicIcon name="arrow" size={17} />
              </Link>
              <Link
                href="/doctors"
                data-testid="home-find-doctor"
                className="inline-flex min-h-13 items-center justify-center rounded-full border border-[#BFD4CE] bg-white px-6 text-sm font-semibold text-[#24544E] transition hover:border-[#176B67] hover:bg-[#F7FBFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B67]"
              >
                Find a doctor
              </Link>
              <Link
                href="/specialties"
                data-testid="home-explore-specialties"
                className="inline-flex min-h-13 items-center justify-center rounded-full px-4 text-sm font-semibold text-[#176B67] transition hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B67]"
              >
                Explore specialties
                <PublicIcon name="arrow" size={15} className="ml-2" />
              </Link>
            </div>

            <p className="mt-7 max-w-lg text-xs leading-6 text-[#81908D]">
              MERUNO is a portfolio demonstration using synthetic data. It is
              not a live clinical service.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[34rem] lg:mx-0 lg:justify-self-end">
            <div className="absolute -right-5 -top-6 size-28 rounded-[2rem] border border-[#C9DEDA] bg-[#E7F1EF] sm:-right-8 sm:-top-8 sm:size-36" />
            <div className="absolute -bottom-5 -left-5 size-24 rounded-full bg-[#B9D8D1]/50 blur-sm sm:-bottom-7 sm:-left-7 sm:size-32" />

            <div className="relative overflow-hidden rounded-[2rem] border border-[#DDE8E5] bg-white p-5 shadow-[0_28px_80px_-35px_rgba(23,75,69,0.35)] sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-[#EDF1F0] pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78908B]">
                    The MERUNO experience
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#243B3B] sm:text-2xl">
                    Care, clearly.
                  </h2>
                </div>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8F2F0] text-[#176B67]">
                  <PublicIcon name="heart" size={22} />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#F5F8F7] p-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#7A8C88]">
                    Clinic model
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#243B3B]">Outpatient</p>
                  <p className="mt-1 text-xs leading-5 text-[#7A8C88]">Single clinic branch</p>
                </div>
                <div className="rounded-2xl bg-[#F5F8F7] p-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#7A8C88]">
                    Care areas
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#243B3B]">
                    {catalog ? specialties.length : "—"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#7A8C88]">Active specialties</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  {
                    icon: "calendar" as const,
                    title: "Appointments",
                    detail: "A clear route from choosing a service to planning a visit.",
                  },
                  {
                    icon: "stethoscope" as const,
                    title: "Specialist consultations",
                    detail: "A clinic catalogue organized around medical specialties.",
                  },
                  {
                    icon: "flask" as const,
                    title: "Diagnostic services",
                    detail: "Internal laboratory, Digital X-ray, and Ultrasound.",
                  },
                ].map((item, index) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-4 rounded-2xl border border-[#E8EEED] p-4"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F2F0] text-[#176B67]">
                      <PublicIcon name={item.icon} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#2E4744]">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#7A8C88]">{item.detail}</p>
                    </div>
                    <span className="hidden size-7 shrink-0 items-center justify-center rounded-full bg-[#F5F8F7] text-xs font-semibold text-[#6F8580] sm:flex">
                      0{index + 1}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                data-testid="home-account-sign-in"
                className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-[#176B67] px-5 py-4 text-white transition hover:bg-[#125A56] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B67]"
              >
                <div>
                  <p className="text-xs font-medium text-white/70">Patient and staff access</p>
                  <p className="mt-1 font-semibold">Sign in to your account</p>
                </div>
                <PublicIcon name="arrow" size={20} className="shrink-0" />
              </Link>
            </div>

            {catalog && typeof doctorCount === "number" ? (
              <div className="absolute -bottom-7 right-4 hidden rounded-2xl border border-[#DDE8E5] bg-white px-5 py-4 shadow-xl shadow-[#173D39]/10 sm:block lg:right-[-1.5rem]">
                <p className="text-2xl font-semibold tracking-tight text-[#176B67]">{doctorCount}</p>
                <p className="mt-1 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#7A8C88]">
                  Public doctor profiles
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-7 lg:px-8">
          <SectionHeading
            eyebrow="Explore the clinic"
            title="Find the care area that fits your needs."
            description="Start with the clinic’s specialties and explore the services that are part of the MERUNO outpatient model."
          />

          {catalog && specialties.length > 0 ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {specialties.slice(0, 8).map((specialty, index) => (
                <a
                  key={specialty.id}
                  href={`/specialties/${encodeURIComponent(specialty.id)}`}
                  data-testid="home-specialty-card"
                  className="group block rounded-2xl border border-[#E5ECEA] bg-white p-5 transition hover:-translate-y-1 hover:border-[#B8D1CA] hover:shadow-lg hover:shadow-[#173D39]/5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#176B67]"
                  aria-label={`Explore ${specialty.name} specialty and doctors`}
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[#EAF3F1] text-[#176B67] transition group-hover:bg-[#176B67] group-hover:text-white">
                    <PublicIcon
                      name={index % 3 === 0 ? "heart" : index % 3 === 1 ? "stethoscope" : "shield"}
                      size={21}
                    />
                  </span>
                  <h3 className="mt-5 font-semibold text-[#2C4542]">{specialty.name}</h3>
                  <p className="mt-2 min-h-10 text-sm leading-6 text-[#758681]">
                    {specialty.description?.trim() || "Explore this specialty and its available clinic services."}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#176B67]">
                    View specialty and doctors
                    <PublicIcon name="arrow" size={14} />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-[#CBDAD6] bg-[#F7FAF9] px-6 py-10 text-center">
              <p className="font-semibold text-[#344F4B]">Specialty catalogue unavailable</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#758681]">
                Public specialty information could not be loaded right now. Please
                return shortly to view the active clinic catalogue.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#E8EEED] pt-6">
            <p className="text-sm text-[#758681]">
              {catalog ? `${specialties.length} active specialties in the public catalogue.` : "Clinic catalogue information is temporarily unavailable."}
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link
                href="/specialties"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#176B67] hover:text-[#125A56]"
              >
                All specialties
                <PublicIcon name="arrow" size={16} />
              </Link>
              <Link
                href="/doctors"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#176B67] hover:text-[#125A56]"
              >
                Meet our doctors
                <PublicIcon name="arrow" size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F8F7] py-16 sm:py-20 lg:py-24" id="services">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-7 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="Within the clinic"
              title="Essential services, clearly presented."
              description="The demo focuses on outpatient consultations and the diagnostic services included in the approved clinic scope."
            />
            <Link
              href="/services"
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#C9DAD5] bg-white px-5 py-3 text-sm font-semibold text-[#34514D] transition hover:border-[#AFC9C2] hover:text-[#176B67]"
            >
              All services
              <PublicIcon name="arrow" size={16} />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {serviceHighlights.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="group rounded-[1.6rem] border border-[#E1EAE7] bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#173D39]/5 sm:p-7"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF3F1] text-[#176B67] transition group-hover:bg-[#176B67] group-hover:text-white">
                  <PublicIcon name={service.icon} size={23} />
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-[#2B4642]">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#71827E]">{service.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#176B67]">
                  Learn more
                  <PublicIcon name="arrow" size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-7 md:grid-cols-[0.9fr_1.1fr] md:items-center lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#52837D]">
              A focused clinic model
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#243B3B] sm:text-4xl">
              Built around the everyday flow of an outpatient clinic.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#687A77]">
              MERUNO brings together public clinic information, appointments,
              consultations, diagnostic services, and patient access in one
              portfolio demonstration.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["01", "Discover", "Review the specialties and services included in the clinic."],
              ["02", "Plan", "Choose an available appointment time through the online booking journey."],
              ["03", "Access", "Enter the patient portal to manage supported patient-facing information."],
              ["04", "Stay informed", "Find released patient-facing information in the appropriate portal area."],
            ].map(([number, title, description]) => (
              <div key={number} className="rounded-2xl border border-[#E6EDEA] bg-[#F8FAF9] p-5">
                <p className="text-xs font-semibold tracking-[0.16em] text-[#7FA39B]">{number}</p>
                <h3 className="mt-3 font-semibold text-[#2D4844]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#758681]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#176B67] py-14 text-white sm:py-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 sm:px-7 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
              Continue exploring
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              See what MERUNO brings together.
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Learn more about the clinic model or explore the services included
              in this portfolio demonstration.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/specialties"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore specialties
            </Link>
            <Link
              href="/book-appointment"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#176B67] transition hover:bg-[#EAF3F1]"
            >
              Book an appointment
              <PublicIcon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>
      </main>
    </PublicSiteLayout>
  );
}
