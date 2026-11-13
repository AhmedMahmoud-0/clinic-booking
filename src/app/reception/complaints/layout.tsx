import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AuthorizationError } from "@/server/auth/authorization/errors";
import { requireEmployeePermission } from "@/server/auth/authorization/actor";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";

function ReceptionComplaintAccessDenied() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#F5F8F7] px-4 py-12 text-[#243B3B]">
      <section className="w-full max-w-lg rounded-3xl border border-[#E2EBE7] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#EAF4F1] text-xl font-bold text-[#176B67]">M</div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">MERUNO Reception</p>
        <h1 className="mt-2 text-2xl font-semibold">Complaint intake is restricted</h1>
        <p className="mt-3 text-sm leading-7 text-[#6F817C]">This account does not have the active Reception complaint-intake permission required to record a complaint.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-[#DCE7E3] px-5 text-sm font-semibold text-[#4E6861]">Return to website</Link>
      </section>
    </main>
  );
}

export default async function ReceptionComplaintLayout({ children }: { children: ReactNode }) {
  try {
    await requireEmployeePermission(CLINIC_PERMISSIONS.COMPLAINT_INTAKE);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.status === 401) redirect("/login");
      return <ReceptionComplaintAccessDenied />;
    }
    throw error;
  }

  return (
    <div dir="ltr" className="min-h-screen bg-[#F5F8F7] text-[#243B3B]">
      <header className="border-b border-[#E4ECE9] bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/reception/complaints" className="flex min-w-0 items-center gap-3" aria-label="MERUNO Reception complaint intake">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#176B67] text-sm font-bold text-white">M</span>
            <span><span className="block text-base font-semibold tracking-[0.12em]">MERUNO</span><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#78908A]">Reception · Complaint intake</span></span>
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
