import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About MERUNO" },
  { href: "/services", label: "Services" },
  { href: "/login", label: "Patient portal" },
];

export function PublicSiteFooter() {
  return (
    <footer className="w-full min-w-0 border-t border-[#E0E9E6] bg-white">
      <div className="mx-auto grid w-full min-w-0 max-w-7xl gap-10 px-5 py-12 sm:px-7 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] lg:px-8 lg:py-14">
        <div className="max-w-md">
          <Link href="/" className="inline-flex flex-col leading-none" aria-label="MERUNO Medical Clinics home">
            <span className="text-lg font-semibold tracking-[0.16em] text-[#243B3B]">MERUNO</span>
            <span className="mt-2 text-[0.62rem] font-semibold tracking-[0.2em] text-[#718381]">
              MEDICAL CLINICS
            </span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-7 text-[#687A77]">
            A focused digital experience for a multi-specialty outpatient clinic.
          </p>
        </div>

        <div className="min-w-0 md:justify-self-end">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7B8B88]">
            Explore MERUNO
          </h2>
          <nav aria-label="Footer navigation" className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#526563] transition hover:text-[#176B67]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-[#E8EEED]">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-2 px-5 py-5 text-xs leading-5 text-[#7B8B88] sm:px-7 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} MERUNO Medical Clinics. Portfolio demonstration.</p>
          <p>This demo uses synthetic data only and is not for real clinical use.</p>
        </div>
      </div>
    </footer>
  );
}
