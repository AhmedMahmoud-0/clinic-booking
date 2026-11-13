import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Email verification | MERUNO Medical Clinics", description: "Email verification result for your MERUNO account." };
interface VerificationCompletePageProps { searchParams: Promise<{ error?: string }>; }

export default async function VerificationCompletePage({ searchParams }: VerificationCompletePageProps) {
  const { error } = await searchParams;
  const verified = !error;
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_10%_15%,rgba(23,107,103,0.08),transparent_28%),#F3F7F5] px-4 py-8 text-[#243B39] sm:px-6">
      <section className="w-full max-w-[650px] rounded-[28px] border border-[#E0EAE6] bg-white p-6 shadow-[0_24px_70px_rgba(25,58,53,0.1)] sm:p-10">
        <Link href="/" className="inline-flex items-center gap-3 text-[#176B67] no-underline"><span className="grid size-11 place-items-center rounded-2xl border border-[#D5E8E2] bg-[#EAF4F1] text-xl font-extrabold">M</span><span className="flex flex-col leading-none"><strong className="text-base font-extrabold tracking-[0.15em]">MERUNO</strong><small className="mt-1 text-[0.55rem] font-bold tracking-[0.2em]">MEDICAL CLINICS</small></span></Link>
        <span className="mt-7 inline-flex rounded-full bg-[#EAF4F1] px-3 py-1.5 text-[0.62rem] font-extrabold tracking-[0.17em] text-[#176B67]">EMAIL VERIFICATION</span>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-[#233B39]">{verified ? "Email verified" : "Verification link not accepted"}</h1>
        <p className="mt-3 text-sm leading-7 text-[#647772]">{verified ? "Your email address is verified. Sign in to continue. Your patient record must still be linked by authorized clinic staff before patient information is available." : "The verification link is invalid or expired. Return to registration and request another verification email."}</p>
        <Link className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#176B67] px-5 text-sm font-bold text-white transition hover:bg-[#125A56]" href={verified ? "/login" : "/register"}>{verified ? "Go to sign in" : "Return to registration"}</Link>
      </section>
    </main>
  );
}
