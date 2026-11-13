import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSecurityForm } from "../../../components/auth/account-security-form";
import { getAuthSession } from "../../../server/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account security | MERUNO Medical Clinics", description: "Manage your MERUNO account password." };

export default async function AccountSecurityPage() {
  const session = await getAuthSession();
  if (!session?.user.emailVerified) redirect("/login");
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_10%_15%,rgba(23,107,103,0.08),transparent_28%),#F3F7F5] px-4 py-8 text-[#243B39] sm:px-6">
      <section className="w-full max-w-[760px] rounded-[28px] border border-[#E0EAE6] bg-white p-6 shadow-[0_24px_70px_rgba(25,58,53,0.1)] sm:p-10 lg:p-12">
        <Link href="/" className="inline-flex items-center gap-3 text-[#176B67] no-underline"><span className="grid size-11 place-items-center rounded-2xl border border-[#D5E8E2] bg-[#EAF4F1] text-xl font-extrabold">M</span><span className="flex flex-col leading-none"><strong className="text-base font-extrabold tracking-[0.15em]">MERUNO</strong><small className="mt-1 text-[0.55rem] font-bold tracking-[0.2em]">MEDICAL CLINICS</small></span></Link>
        <span className="mt-7 inline-flex rounded-full bg-[#EAF4F1] px-3 py-1.5 text-[0.62rem] font-extrabold tracking-[0.17em] text-[#176B67]">ACCOUNT SECURITY</span>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-[#233B39]">Change your password</h1>
        <p className="mt-3 mb-7 text-sm leading-7 text-[#647772]">Signed in as <strong>{session.user.email}</strong>. You must provide your current password. Other active sessions are revoked after a successful password change. Email changes are deferred until the clinic contact synchronization workflow is implemented.</p>
        <AccountSecurityForm />
        <div className="mt-8 flex flex-wrap gap-5 border-t border-[#EDF2EF] pt-5"><Link className="text-sm font-semibold text-[#176B67] hover:underline" href="/auth/account-status">Back to account status</Link><Link className="text-sm font-semibold text-[#75847E] hover:text-[#176B67] hover:underline" href="/">MERUNO home</Link></div>
      </section>
    </main>
  );
}
