import Link from "next/link";

import { PublicIcon } from "./public-icon";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/specialties", label: "Specialties" },
  { href: "/doctors", label: "Doctors" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

function Brand() {
  return (
    <Link
      href="/"
      aria-label="MERUNO Medical Clinics home"
      className="group inline-flex min-w-0 shrink-0 items-center gap-3"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#176B67] text-white shadow-sm transition-transform group-hover:-translate-y-0.5">
        <svg aria-hidden="true" viewBox="0 0 32 32" className="size-6" fill="none">
          <path
            d="M5 24V8l7.1 9.1L19 8v16M19 24V8l8 8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-[1.12rem] font-semibold tracking-[0.13em] text-[#243B3B]">
          MERUNO
        </span>
        <span className="mt-1.5 whitespace-nowrap text-[0.57rem] font-semibold tracking-[0.19em] text-[#718381]">
          MEDICAL CLINICS
        </span>
      </span>
    </Link>
  );
}

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            mobile
              ? "flex min-w-0 items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-[#344B49] transition hover:bg-[#F1F7F5] hover:text-[#176B67]"
              : "whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-[#526563] transition hover:bg-[#F1F7F5] hover:text-[#176B67]"
          }
        >
          {item.label}
          {mobile ? <PublicIcon name="chevron" size={16} /> : null}
        </Link>
      ))}
    </>
  );
}

export function PublicSiteHeader() {
  return (
    <header className="relative z-40 w-full min-w-0 border-b border-[#E8EEED] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[82px] w-full min-w-0 max-w-7xl items-center justify-between gap-4 px-5 sm:px-7 lg:px-8">
        <Brand />

        <nav aria-label="Main navigation" className="hidden min-w-0 items-center gap-0.5 xl:flex">
          <NavigationLinks />
        </nav>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <Link
            href="/login"
            className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-[#526563] transition hover:bg-[#F1F7F5] hover:text-[#176B67]"
          >
            Sign in
          </Link>
          <Link
            href="/book-appointment"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#176B67] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#125A56] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B67]"
          >
            Book appointment
            <PublicIcon name="arrow" size={16} />
          </Link>
        </div>

        <details className="group relative shrink-0 xl:hidden">
          <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-xl border border-[#E1EAE7] text-[#24413F] transition hover:bg-[#F5F8F7] [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Open navigation menu</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </summary>
          <div className="absolute right-0 top-[calc(100%+0.75rem)] w-[min(19rem,calc(100vw-2.5rem))] rounded-2xl border border-[#E5ECEA] bg-white p-3 shadow-xl shadow-[#173D39]/10">
            <nav aria-label="Mobile navigation" className="grid max-h-[min(70vh,34rem)] gap-1 overflow-y-auto">
              <NavigationLinks mobile />
              <Link
                href="/login"
                className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-[#344B49] transition hover:bg-[#F1F7F5] hover:text-[#176B67]"
              >
                Sign in
                <PublicIcon name="chevron" size={16} />
              </Link>
              <Link
                href="/book-appointment"
                className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white transition hover:bg-[#125A56]"
              >
                Book appointment
                <PublicIcon name="arrow" size={16} />
              </Link>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
