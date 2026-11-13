import type { Metadata } from "next";

import { PublicPageIntro } from "@/components/public-site/section-heading";

export const metadata: Metadata = { title: "Frequently Asked Questions | MERUNO Medical Clinics", description: "Answers about appointment booking and the services included in the MERUNO clinic demonstration." };

const questions = [
  { question: "How do I book an appointment?", answer: "Choose a specialty, select a doctor who offers the consultation service, choose a date and one of the available times, then complete the patient or guest details. A booking is confirmed only after the booking service accepts the request." },
  { question: "Can I book without a patient account?", answer: "Yes. The guest booking path asks for a full name and phone number. Email is optional. A guest booking does not create a patient record or medical file, and no phone OTP is part of this demonstration." },
  { question: "Are the times shown guaranteed?", answer: "The availability list is advisory until the booking is submitted. The server checks the selected time again when confirming the appointment. If it has been taken, choose another available time." },
  { question: "Can I cancel or reschedule an appointment?", answer: "Patient self-service changes are governed by the clinic's existing 24-hour policy. Requests inside that window must be handled by Reception. The server remains responsible for confirming whether an action is allowed." },
  { question: "How early should I arrive?", answer: "The project workflow uses a 15-minute early-arrival target. The 10-minute grace period is handled by Reception; an appointment is not automatically cancelled merely because someone is late." },
  { question: "Which imaging services are included?", answer: "The approved clinic model includes Digital X-ray and Ultrasound only. Other imaging modalities are outside this demonstration's scope." },
  { question: "When will laboratory or imaging results be available?", answer: "Results appear in the patient-facing experience only after the required review and release steps. This demonstration does not promise a fixed turnaround time." },
  { question: "Does this website accept real appointments?", answer: "No. MERUNO is a portfolio demonstration using synthetic data. It is not a live clinical service and must not be used to arrange real medical care." },
];

export default function FaqPage() {
  return <main id="main-content" className="pb-20"><PublicPageIntro eyebrow="Help centre" title="Frequently asked questions" description="Practical information about the booking journey and the boundaries of the MERUNO clinic demonstration." /><section className="mx-auto max-w-4xl px-5 py-12 sm:px-7 lg:py-16"><div className="space-y-3">{questions.map((item, index) => <details key={item.question} open={index === 1} className="group rounded-2xl border border-[#E5ECEA] bg-white p-5 open:border-[#C9DDD7] sm:p-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#2C4541] marker:hidden [&::-webkit-details-marker]:hidden"><span><span className="mr-3 text-xs font-semibold text-[#8AA29B]">0{index + 1}</span>{item.question}</span><span aria-hidden="true" className="text-xl font-light text-[#176B67] transition group-open:rotate-45">+</span></summary><p className="mt-4 max-w-3xl pl-9 text-sm leading-7 text-[#71817D]">{item.answer}</p></details>)}</div></section></main>;
}
