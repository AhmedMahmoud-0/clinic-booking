import Link from "next/link";

const linkGroups = [
  {
    title: "Explore MERUNO",
    links: [
      { href: "/", label: "Home" },
      { href: "/about", label: "About MERUNO" },
      { href: "/services", label: "Services" },
    ],
  },
  {
    title: "Find care",
    links: [
      { href: "/specialties", label: "Specialties" },
      { href: "/doctors", label: "Doctors" },
      { href: "/book-appointment", label: "Book appointment" },
    ],
  },
  {
    title: "Patient support",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy notice" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
] as const;

function FooterBrand() {
  return (
    <Link
      href="/"
      aria-label="MERUNO Medical Clinics home"
      className="group inline-flex items-center gap-3"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#176B67] text-white shadow-sm transition-transform group-hover:-translate-y-0.5">
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
      <span className="flex flex-col leading-none">
        <span className="text-lg font-semibold tracking-[0.13em] text-[#243B3B]">MERUNO</span>
        <span className="mt-1.5 text-[0.58rem] font-semibold tracking-[0.19em] text-[#718381]">MEDICAL CLINICS</span>
      </span>
    </Link>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-[#D7E8E2] bg-[#EAF4F1]">
      <div className="mx-auto grid w-full max-w-7xl gap-9 px-5 py-11 sm:px-7 md:grid-cols-2 lg:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))] lg:gap-8 lg:px-8 lg:py-14">
        <div className="max-w-xs">
          <FooterBrand />
          <p className="mt-5 text-sm font-semibold text-[#315A53]">Care, clearly.</p>
          <p className="mt-2 text-sm leading-7 text-[#647C75]">
            A focused digital experience for a multi-specialty outpatient clinic.
          </p>
        </div>

        {linkGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#52756D]">
              {group.title}
            </h2>
            <nav aria-label={`${group.title} footer links`} className="mt-4 grid gap-3">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="w-fit text-sm font-medium text-[#526B64] transition hover:text-[#176B67] hover:underline hover:underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176B67]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="border-t border-[#D8E8E2]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-5 text-xs leading-5 text-[#6E817B] sm:px-7 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} MERUNO Medical Clinics. Portfolio demonstration.</p>
          <p>This demo uses synthetic data only and is not for real clinical use.</p>
        </div>
      </div>
    </footer>
  );
}
