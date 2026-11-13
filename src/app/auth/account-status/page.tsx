import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "../../../components/auth/sign-out-button";
import { getPostSignInDestinations } from "../../../server/auth/authorization/post-sign-in-destination";
import { getCurrentAuthActor } from "../../../server/auth/authorization/actor";
import { getAuthSession } from "../../../server/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Choose your MERUNO workspace",
  description: "Continue to a clinic workspace available to your verified account.",
};

function AccountBrand() {
  return <Link href="/" aria-label="MERUNO home" className="inline-flex w-fit items-center gap-3 text-[#176B67] no-underline"><span className="grid size-11 place-items-center rounded-2xl border border-[#D5E8E2] bg-[#EAF4F1] text-xl font-extrabold">M</span><span className="flex flex-col leading-none"><strong className="text-base font-extrabold tracking-[0.15em]">MERUNO</strong><small className="mt-1 text-[0.55rem] font-bold tracking-[0.2em]">MEDICAL CLINICS</small></span></Link>;
}

export default async function AccountStatusPage() {
  const [actor, session] = await Promise.all([getCurrentAuthActor(), getAuthSession()]);
  if (!actor || !session) redirect("/login");
  const destinations = getPostSignInDestinations(actor);
  if (destinations.length === 1) redirect(destinations[0].href);

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_10%_15%,rgba(23,107,103,0.08),transparent_28%),#F3F7F5] px-4 py-8 text-[#243B39] sm:px-6">
      <section className="w-full max-w-[760px] rounded-[28px] border border-[#E0EAE6] bg-white p-6 shadow-[0_24px_70px_rgba(25,58,53,0.1)] sm:p-10 lg:p-12">
        <AccountBrand />
        <span className="mt-7 inline-flex rounded-full bg-[#EAF4F1] px-3 py-1.5 text-[0.62rem] font-extrabold tracking-[0.17em] text-[#176B67]">SECURE ACCOUNT SESSION</span>
        {destinations.length === 0 ? (
          <>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-[#233B39]">Your account is signed in</h1>
            <p className="mt-3 text-sm leading-7 text-[#647772]">Signed in as <strong>{session.user.name}</strong> ({session.user.email}).{actor.employee ? " Your employee identity is active, but this build does not yet expose a landing page for one of its workspaces. Your roles and permissions have not been changed." : actor.patient ? " Your patient identity is active, but a patient portal destination could not be resolved. Patient record access remains protected." : " This account does not currently have an active, verified patient or employee identity linked to it. Clinic access remains restricted until the appropriate identity-verification and linking process is completed."}</p>
            <div className="mt-6 rounded-2xl border border-[#E2ECE7] bg-[#F6FAF8] p-4 text-sm leading-7 text-[#647772]" role="status">{actor.employee ? "No role or access permission was changed by this sign-in. Contact the clinic administrator if you believe a workspace should be available." : "Patient sign-up creates a sign-in identity only. It does not create a medical record or grant employee access."}</div>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-[#233B39]">Where would you like to continue?</h1>
            <p className="mt-3 text-sm leading-7 text-[#647772]">Signed in as <strong>{session.user.name}</strong> ({session.user.email}). Choose one of the workspaces available to your verified account.</p>
            <div className="mt-7 grid gap-3">
              {destinations.map((destination) => <Link key={`${destination.kind}:${destination.href}`} href={destination.href} className="group flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-[#DFEAE5] bg-white p-5 text-inherit no-underline transition hover:-translate-y-0.5 hover:border-[#9EC6B9] hover:bg-[#F8FCFA] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#176B67]"><span className="grid min-w-0 gap-1"><strong className="text-base font-extrabold text-[#20534D]">{destination.title}</strong><span className="text-sm leading-6 text-[#74837E]">{destination.description}</span></span><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EAF4F0] text-lg font-bold text-[#176B67] transition group-hover:translate-x-0.5" aria-hidden="true">→</span></Link>)}
            </div>
          </>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#EDF2EF] pt-5">
          <Link href="/auth/account-security" className="text-sm font-bold text-[#176B67] hover:underline">Account security</Link>
          <SignOutButton />
          <Link href="/" className="text-sm font-semibold text-[#75847E] hover:text-[#176B67] hover:underline">Return to website</Link>
        </div>
      </section>
    </main>
  );
}
