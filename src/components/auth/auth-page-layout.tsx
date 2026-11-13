import type { ReactNode } from "react";
import Link from "next/link";

interface AuthPageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="MERUNO Medical Clinics home"
      className={`group inline-flex w-fit items-center gap-3 text-inherit no-underline ${compact ? "text-[#176B67]" : "text-white"}`}
    >
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl border text-2xl font-extrabold tracking-[-0.08em] shadow-sm ${compact ? "border-[#D5E8E2] bg-[#EAF4F1] text-[#176B67]" : "border-white/30 bg-white/10 text-white"}`}>
        M
      </span>
      <span className="flex flex-col leading-none">
        <strong className="text-[1.05rem] font-extrabold tracking-[0.15em]">MERUNO</strong>
        <small className="mt-1.5 text-[0.58rem] font-bold tracking-[0.22em] opacity-80">MEDICAL CLINICS</small>
      </span>
    </Link>
  );
}

export function AuthPageLayout({ eyebrow, title, description, children }: AuthPageLayoutProps) {
  return (
    <main
      data-testid="auth-layout"
      className="grid min-h-screen place-items-center overflow-x-hidden bg-[radial-gradient(circle_at_10%_12%,rgba(23,107,103,0.09),transparent_30%),radial-gradient(circle_at_90%_88%,rgba(139,185,173,0.16),transparent_28%),#F3F7F5] px-4 py-5 text-[#243B39] sm:px-6 sm:py-8"
    >
      <div className="grid min-h-[min(760px,calc(100vh-2.5rem))] w-full max-w-[1120px] overflow-hidden rounded-[30px] border border-[#E0EAE6] bg-white shadow-[0_32px_90px_rgba(25,58,53,0.13)] lg:grid-cols-[0.94fr_1.06fr]">
        <section
          data-testid="auth-brand-panel"
          aria-label="MERUNO Medical Clinics"
          className="relative isolate flex min-h-[230px] flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,#176B67_0%,#145B57_54%,#103F40_100%)] p-6 text-white sm:min-h-[270px] sm:p-9 lg:min-h-0 lg:p-12"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#176B67",
            backgroundImage: "linear-gradient(145deg, #176B67 0%, #145B57 54%, #103F40 100%)",
            color: "#FFFFFF",
          }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 -right-48 -z-10 size-[500px] rounded-full border border-white/15 shadow-[0_0_0_42px_rgba(255,255,255,0.035),0_0_0_92px_rgba(255,255,255,0.025)]" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-48 top-32 -z-10 size-[300px] rounded-full border border-white/10 shadow-[0_0_0_30px_rgba(255,255,255,0.025)]" />
          <Brand />
          <div className="my-8 max-w-[420px] lg:my-12">
            <span className="inline-flex items-center gap-2 text-[0.65rem] font-extrabold tracking-[0.2em] text-[#C5E2DC]">CARE, CLEARLY.</span>
            <h1 className="mt-4 max-w-[440px] text-[2.3rem] font-semibold leading-[1.04] tracking-[-0.055em] sm:text-[3rem]">Your health journey, in one place.</h1>
            <p className="mt-5 max-w-[370px] text-sm leading-8 text-white/80">Secure access to your clinic account, appointments, and the services available to your verified identity.</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-white/85">
            <span className="grid size-7 place-items-center rounded-full border border-white/25 bg-white/10 text-sm text-[#D8EEE8]">✓</span>
            <span>Private account access</span>
          </div>
        </section>

        <section data-testid="auth-form-panel" className="flex min-w-0 flex-col justify-center px-6 py-8 sm:px-10 sm:py-11 lg:px-[clamp(2.5rem,6vw,5.1rem)] lg:py-14">
          <div className="mb-8 lg:mb-9">
            <div className="mb-6 lg:hidden"><Brand compact /></div>
            <span className="inline-flex items-center rounded-full bg-[#EAF4F1] px-3 py-1.5 text-[0.63rem] font-extrabold tracking-[0.17em] text-[#176B67]">{eyebrow}</span>
            <h2 className="mt-4 text-[2rem] font-bold leading-tight tracking-[-0.05em] text-[#233B39] sm:text-[2.35rem]">{title}</h2>
            <p className="mt-3 max-w-[400px] text-sm leading-7 text-[#647772]">{description}</p>
          </div>
          <div className="w-full max-w-[440px]">{children}</div>
          <div className="mt-8 border-t border-[#EDF2EF] pt-5">
            <Link href="/" className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-[#176B67] transition hover:text-[#0F504C] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176B67]">
              <span aria-hidden="true">←</span> Back to MERUNO website
            </Link>
            <p className="mt-4 text-[0.68rem] leading-5 text-[#82908B]">MERUNO is a portfolio demonstration using synthetic data. It is not a live clinical service.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
