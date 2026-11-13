import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthorizationError } from "../../server/auth/authorization/errors";
import { requirePatientPortalAccess } from "../../server/auth/authorization/workspaces";
import { PatientPortalShell } from "../../components/patient-portal/patient-portal-shell";

function PatientPortalAccessRequired() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#F5F8F7] px-4 py-12 text-[#243B3B]">
      <section className="w-full max-w-lg rounded-3xl border border-[#E2EBE7] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#EAF4F1] text-xl font-bold text-[#176B67]">M</div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">MERUNO Patient Portal</p>
        <h1 className="mt-2 text-2xl font-semibold">Patient access is not active</h1>
        <p className="mt-3 text-sm leading-7 text-[#6F817C]">
          This account does not currently have an active, verified patient identity linked to it. Use the patient account linked by the clinic, or contact Reception to review your account link.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-[#176B67] px-5 text-sm font-semibold text-white">Sign in</Link>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border border-[#DCE7E3] px-5 text-sm font-semibold text-[#4E6861]">Return to website</Link>
        </div>
      </section>
    </main>
  );
}

export default async function PatientPortalLayout({ children }: { children: ReactNode }) {
  try {
    await requirePatientPortalAccess();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.status === 401) redirect("/login");
      return <PatientPortalAccessRequired />;
    }
    throw error;
  }

  return <PatientPortalShell>{children}</PatientPortalShell>;
}
