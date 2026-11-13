import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthorizationError } from "@/server/auth/authorization/errors";
import { requireEmployeeWorkspace } from "@/server/auth/authorization/workspaces";
import { ClinicManagerShell } from "@/components/clinic-manager/clinic-manager-shell";

function ClinicManagerAccessDenied() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#F5F8F7] px-4 py-12 text-[#243B3B]">
      <section className="w-full max-w-lg rounded-3xl border border-[#E2EBE7] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#EAF4F1] text-xl font-bold text-[#176B67]">M</div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">MERUNO Clinic Manager</p>
        <h1 className="mt-2 text-2xl font-semibold">Manager access is restricted</h1>
        <p className="mt-3 text-sm leading-7 text-[#6F817C]">This account does not have the active Clinic Manager permissions required to open this operational workspace.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-[#DCE7E3] px-5 text-sm font-semibold text-[#4E6861]">Return to website</Link>
      </section>
    </main>
  );
}

export default async function ClinicManagerLayout({ children }: { children: ReactNode }) {
  try {
    await requireEmployeeWorkspace("CLINIC_MANAGER");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.status === 401) redirect("/login");
      return <ClinicManagerAccessDenied />;
    }
    throw error;
  }

  return <ClinicManagerShell>{children}</ClinicManagerShell>;
}
