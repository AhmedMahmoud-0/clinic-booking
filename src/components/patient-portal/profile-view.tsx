"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPortalDate, humanizePortalValue } from "./portal-format";

type Profile = {
  medicalRecordNumber: string;
  fullName: string;
  preferredName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  contacts: Array<{ type: string; value: string; isPrimary: boolean; isVerified: boolean }>;
  address: string | null;
  account: { email: string; emailVerified: boolean } | null;
};

export function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/patient/portal/profile", { cache: "no-store" });
        const payload = await response.json() as { profile?: Profile; error?: { message?: string } };
        if (!response.ok || !payload.profile) throw new Error(payload.error?.message || "Your profile could not be loaded.");
        if (active) setProfile(payload.profile);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Your profile could not be loaded.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const phone = profile?.contacts.find((contact) => contact.type === "PHONE" && contact.isPrimary) ?? profile?.contacts.find((contact) => contact.type === "PHONE");
  const email = profile?.contacts.find((contact) => contact.type === "EMAIL" && contact.isPrimary) ?? profile?.contacts.find((contact) => contact.type === "EMAIL");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Personal information</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">My profile</h1>
        <p className="mt-2 text-sm leading-6 text-[#74857F]">Your clinic patient details and sign-in account information.</p>
      </header>
      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}
      <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF2F0] pb-4">
          <div><h2 className="text-lg font-semibold text-[#2D4943]">Patient record</h2><p className="mt-1 text-sm text-[#7B8B85]">Details recorded in the clinic system.</p></div>
          <span className="rounded-full bg-[#F1F6F3] px-3 py-1 text-xs font-semibold text-[#527067]">Read-only</span>
        </div>
        {isLoading ? <div className="mt-5 h-36 animate-pulse rounded-xl bg-[#F2F6F4]" /> : null}
        {profile ? <dl className="grid gap-5 pt-5 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Full name</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{profile.fullName || "Not recorded"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Preferred name</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{profile.preferredName || "Not recorded"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Medical record number</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{profile.medicalRecordNumber}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Date of birth</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{formatPortalDate(profile.dateOfBirth)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Gender</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{humanizePortalValue(profile.gender)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Primary phone</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{phone?.value || "Not recorded"}{phone?.isVerified ? <span className="ml-2 text-xs font-medium text-[#34765E]">Verified</span> : null}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Primary patient email</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{email?.value || "Not recorded"}{email?.isVerified ? <span className="ml-2 text-xs font-medium text-[#34765E]">Verified</span> : null}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Primary address</dt><dd className="mt-2 text-sm font-semibold text-[#3C5750]">{profile.address || "Not recorded"}</dd></div>
        </dl> : null}
      </section>

      <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-[#2D4943]">Sign-in account</h2><p className="mt-1 text-sm text-[#7B8B85]">Authentication details are separate from the clinic patient record.</p></div>
          <Link href="/auth/account-security" className="inline-flex min-h-10 items-center rounded-xl border border-[#C9DDD6] px-4 text-sm font-semibold text-[#176B67] hover:bg-[#F0F7F4]">Account security</Link>
        </div>
        {profile?.account ? <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Sign-in email</p><p className="mt-2 text-sm font-semibold text-[#3C5750]">{profile.account.email}</p><p className={`mt-1 text-xs ${profile.account.emailVerified ? "text-[#34765E]" : "text-[#9A7136]"}`}>{profile.account.emailVerified ? "Email verified" : "Email verification pending"}</p></div> : <p className="mt-5 text-sm text-[#7B8B85]">No linked sign-in email is available for this patient profile.</p>}
      </section>

      <section className="rounded-2xl border border-[#E8E7D9] bg-[#FFFCF2] p-5">
        <h2 className="font-semibold text-[#766640]">Patient data access and correction requests</h2>
        <p className="mt-2 text-sm leading-6 text-[#887B5C]">This portfolio demonstration does not yet include a dedicated, trackable workflow for requesting a copy of patient data or correcting clinic demographic details. No request can be submitted or tracked from this page. The public contact page is also a non-connected demo page; do not send personal or medical information through it.</p>
        <p className="mt-2 text-sm leading-6 text-[#887B5C]">Account password and security controls remain available separately. A live implementation requires an approved administrative request process with its own protected records and audit trail.</p>
      </section>
    </div>
  );
}
