"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { SignOutButton } from "../auth/sign-out-button";

const NAV_ITEMS = [
  { href: "/portal", label: "Dashboard", exact: true },
  { href: "/portal/appointments", label: "My Appointments", exact: false },
  { href: "/portal/visits", label: "Visit History", exact: false },
  { href: "/portal/records", label: "Medical Records", exact: false },
  { href: "/portal/billing", label: "Invoices & Receipts", exact: false },
  { href: "/portal/family", label: "Family & Access", exact: false },
  { href: "/portal/complaints", label: "Complaints", exact: false },
  { href: "/portal/notifications", label: "Notifications", exact: false },
  { href: "/portal/profile", label: "My Profile", exact: false },
] as const;

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Patient portal navigation" className="grid gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition ${active ? "bg-[#EAF4F1] text-[#176B67]" : "text-[#536963] hover:bg-[#F3F7F5] hover:text-[#176B67]"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PortalBrand() {
  return (
    <Link href="/portal" className="flex min-w-0 items-center gap-3" aria-label="MERUNO Patient Portal home">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#176B67] text-white">
        <svg aria-hidden="true" viewBox="0 0 32 32" className="size-6" fill="none">
          <path d="M5 24V8l7.1 9.1L19 8v16M19 24V8l8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold tracking-[0.12em] text-[#23413E]">MERUNO</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#78908A]">Patient Portal</span>
      </span>
    </Link>
  );
}

export function PatientPortalShell({ children }: { children: ReactNode }) {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const closeMobileMenu = () => {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
  };

  return (
    <div dir="ltr" className="min-h-screen bg-[#F5F8F7] text-[#243B3B]">
      <header className="sticky top-0 z-30 border-b border-[#E4ECE9] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <PortalBrand />
          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/auth/account-security" className="rounded-lg px-3 py-2 text-sm font-medium text-[#536963] hover:bg-[#F3F7F5]">Account security</Link>
            <SignOutButton />
          </div>
          <details ref={mobileMenuRef} className="relative lg:hidden">
            <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-xl border border-[#DCE7E3] px-3 text-sm font-semibold text-[#48635D] marker:hidden">
              Menu <span className="ml-2 text-[#176B67]" aria-hidden="true">☰</span>
            </summary>
            <div className="absolute right-0 top-12 z-40 max-h-[min(72vh,38rem)] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-[#E2EBE7] bg-white p-3 shadow-xl">
              <NavigationLinks onNavigate={closeMobileMenu} />
              <Link href="/auth/account-security" onClick={closeMobileMenu} className="mt-2 flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[#536963] hover:bg-[#F3F7F5]">Account security</Link>
              <div className="mt-2"><SignOutButton /></div>
            </div>
          </details>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[244px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="hidden self-start rounded-2xl border border-[#E3ECE8] bg-white p-4 lg:sticky lg:top-24 lg:block">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#91A29D]">Your account</p>
          <NavigationLinks />
          <div className="mt-5 border-t border-[#EEF2F0] pt-4">
            <Link href="/auth/account-security" className="flex min-h-10 items-center rounded-xl px-3 text-sm font-medium text-[#536963] hover:bg-[#F3F7F5]">Account security</Link>
          </div>
        </aside>
        <main id="patient-portal-main" className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
