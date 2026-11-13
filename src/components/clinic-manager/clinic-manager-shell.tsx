"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "../auth/sign-out-button";

const NAV_ITEMS = [
  { href: "/clinic-manager", label: "Operations dashboard", exact: true },
  { href: "/clinic-manager/staff", label: "Staff oversight", exact: false },
  { href: "/clinic-manager/complaints", label: "Complaints", exact: false },
  { href: "/clinic-manager/incidents", label: "Incident reports", exact: false },
  { href: "/clinic-manager/billing/approvals", label: "Billing approvals", exact: false },
  { href: "/clinic-manager/reports/operations", label: "Operational reports", exact: false },
  { href: "/clinic-manager/reports/financial", label: "Financial reports", exact: false },
] as const;

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Clinic manager navigation" className="grid gap-1">
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

export function ClinicManagerShell({ children }: { children: ReactNode }) {
  return (
    <div dir="ltr" className="min-h-screen bg-[#F5F8F7] text-[#243B3B]">
      <header className="sticky top-0 z-30 border-b border-[#E4ECE9] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/clinic-manager" className="flex min-w-0 items-center gap-3" aria-label="MERUNO Clinic Manager home">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#176B67] text-sm font-bold tracking-wide text-white">M</span>
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold tracking-[0.12em] text-[#23413E]">MERUNO</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#78908A]">Clinic Manager</span>
            </span>
          </Link>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="rounded-full bg-[#EDF6F2] px-3 py-1.5 text-xs font-semibold text-[#176B67]">Operational workspace</span>
            <SignOutButton />
          </div>
          <details className="relative lg:hidden">
            <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-xl border border-[#DCE7E3] px-3 text-sm font-semibold text-[#48635D] marker:hidden">
              Menu <span className="ml-2 text-[#176B67]" aria-hidden="true">☰</span>
            </summary>
            <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-[#E2EBE7] bg-white p-3 shadow-xl">
              <NavigationLinks />
              <div className="mt-2"><SignOutButton /></div>
            </div>
          </details>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[244px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="hidden self-start rounded-2xl border border-[#E3ECE8] bg-white p-4 lg:sticky lg:top-24 lg:block">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#91A29D]">Management</p>
          <NavigationLinks />
          <div className="mt-5 border-t border-[#EEF2F0] pt-4">
            <p className="px-3 text-xs leading-5 text-[#91A29D]">Operational oversight only. Clinical records remain within their assigned clinical workflows.</p>
            <div className="mt-3 px-3"><SignOutButton /></div>
          </div>
        </aside>
        <main id="clinic-manager-main" className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
