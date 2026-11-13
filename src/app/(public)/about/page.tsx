import type { Metadata } from "next";
import Link from "next/link";

import { PublicIcon } from "@/components/public-site/public-icon";
import { PublicPageIntro, SectionHeading } from "@/components/public-site/section-heading";

export const metadata: Metadata = {
  title: "About MERUNO | Medical Clinics",
  description:
    "Learn about the MERUNO single-branch, multi-specialty outpatient clinic portfolio demonstration.",
};

const scopeItems = [
  { value: "01", title: "One outpatient branch", detail: "A focused clinic model rather than a hospital or multi-branch platform." },
  { value: "07", title: "Medical specialties", detail: "Seven configured specialties within the approved project scope." },
  { value: "08", title: "Doctors", detail: "Eight doctors across the clinic’s specialty structure." },
  { value: "02", title: "Imaging services", detail: "Digital X-ray and Ultrasound only in the initial scope." },
];

const principles = [
  {
    icon: "clipboard" as const,
    title: "Clear information",
    description: "Present clinic information and patient-facing journeys in a straightforward, understandable structure.",
  },
  {
    icon: "heart" as const,
    title: "Connected clinic workflows",
    description: "Bring appointments, consultations, laboratory, and imaging workflows into one coherent application.",
  },
  {
    icon: "shield" as const,
    title: "Respect for patient privacy",
    description: "Expose patient information only through authenticated and appropriately authorized experiences.",
  },
];

export default function AboutPage() {
  return (
    <main id="main-content">
      <PublicPageIntro
        eyebrow="About MERUNO"
        title="A focused clinic model, brought into one digital experience."
        description="MERUNO is a portfolio demonstration of a single-branch, multi-specialty outpatient clinic. Its design is shaped around clear information, coordinated workflows, and patient-facing access."
      />

      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 sm:px-7 md:grid-cols-[1fr_0.9fr] md:items-center lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#52837D]">
              The idea behind MERUNO
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#243B3B] sm:text-4xl">
              Make the clinic journey easier to understand.
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#687A77]">
              <p>
                A multi-specialty outpatient clinic involves more than an
                appointment. Patients need to understand the available care
                areas, know how to arrange a visit, and access the information
                that is ready to be shared with them.
              </p>
              <p>
                MERUNO organizes these experiences around one clinic model:
                public information, appointment workflows, clinical services,
                and a dedicated patient portal.
              </p>
            </div>
            <Link
              href="/services"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#176B67] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#125A56]"
            >
              Explore clinic services
              <PublicIcon name="arrow" size={16} />
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] bg-[#F0F6F4] p-6 sm:p-8">
            <div className="absolute -right-16 -top-16 size-56 rounded-full border-[28px] border-[#D9E9E5]" />
            <div className="relative rounded-[1.5rem] border border-[#DBE7E3] bg-white p-6 shadow-lg shadow-[#174B45]/5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78908B]">
                MERUNO at a glance
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#243B3B]">
                Outpatient care, thoughtfully structured.
              </h3>
              <div className="mt-7 grid grid-cols-2 gap-3">
                {scopeItems.map((item) => (
                  <div key={item.value} className="rounded-2xl bg-[#F5F8F7] p-4">
                    <p className="text-3xl font-semibold tracking-tight text-[#176B67]">{item.value}</p>
                    <p className="mt-2 text-sm font-semibold text-[#344F4B]">{item.title}</p>
                    <p className="mt-2 text-xs leading-5 text-[#7A8C88]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F8F7] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-7 lg:px-8">
          <SectionHeading
            eyebrow="What guides the experience"
            title="A few principles shape the whole experience."
            description="The interface is designed to make the clinic’s scope and supported journeys easier to navigate without overstating what the demo provides."
            align="center"
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {principles.map((item) => (
              <article key={item.title} className="rounded-[1.6rem] border border-[#E2EAE7] bg-white p-6 sm:p-7">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF3F1] text-[#176B67]">
                  <PublicIcon name={item.icon} size={23} />
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-[#2B4642]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#71827E]">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 sm:px-7 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#243B3B]">
              Explore the clinic’s service scope.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#758681]">
              Review consultations, internal laboratory services, and the permitted imaging services.
            </p>
          </div>
          <Link
            href="/services"
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full border border-[#C9DAD5] px-6 text-sm font-semibold text-[#176B67] transition hover:bg-[#F5F8F7]"
          >
            View services
            <PublicIcon name="arrow" size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
