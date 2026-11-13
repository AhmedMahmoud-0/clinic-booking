"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPortalDate, humanizePortalValue } from "./portal-format";

type Grant = {
  id: string;
  direction: "OUTGOING" | "INCOMING";
  subject: { id: string; firstName: string; lastName: string };
  grantee: { id: string; firstName: string; lastName: string };
  relationshipType: string;
  isLegalGuardian: boolean;
  status: string;
  scopes: string[];
  requestedAt: string;
  approvedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  canDecide: boolean;
  canRevoke: boolean;
};

const SCOPE_LABELS: Record<string, string> = {
  VIEW_PROFILE: "View patient profile",
  MANAGE_PROFILE: "Manage patient profile",
  BOOK_APPOINTMENTS: "Book appointments",
  MANAGE_APPOINTMENTS: "Manage appointments",
  VIEW_BILLING: "View billing",
  VIEW_MEDICAL_RECORDS: "View medical records",
  VIEW_DIAGNOSTIC_RESULTS: "View diagnostic results",
};

function getOtherPerson(grant: Grant) {
  return grant.direction === "OUTGOING" ? grant.grantee : grant.subject;
}

export function FamilyAccessView() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyGrantId, setBusyGrantId] = useState<string | null>(null);
  const [confirmRevokeGrantId, setConfirmRevokeGrantId] = useState<string | null>(null);

  const fetchGrants = useCallback(async (): Promise<Grant[]> => {
    const response = await fetch("/api/patient/delegations", { cache: "no-store" });
    const payload = await response.json() as { grants?: Grant[]; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || "Family access could not be loaded.");
    return Array.isArray(payload.grants) ? payload.grants : [];
  }, []);

  const refreshGrants = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setGrants(await fetchGrants());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Family access could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchGrants]);

  useEffect(() => {
    let isActive = true;

    fetchGrants().then((loadedGrants) => {
      if (!isActive) return;
      setGrants(loadedGrants);
      setIsLoading(false);
    }).catch((error: unknown) => {
      if (!isActive) return;
      setErrorMessage(error instanceof Error ? error.message : "Family access could not be loaded.");
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [fetchGrants]);

  async function decideGrant(grantId: string, decision: "APPROVE" | "REJECT") {
    setBusyGrantId(grantId);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/patient/delegations/${encodeURIComponent(grantId)}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
        cache: "no-store",
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "The delegation decision could not be saved.");
      setStatusMessage(decision === "APPROVE" ? "The delegation request has been approved." : "The delegation request has been rejected.");
      await refreshGrants();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The delegation decision could not be saved.");
    } finally {
      setBusyGrantId(null);
    }
  }

  async function revokeGrant(grantId: string) {
    setBusyGrantId(grantId);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/patient/delegations/${encodeURIComponent(grantId)}/revoke`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Revoked by the patient from the Patient Portal." }),
        cache: "no-store",
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "The delegation could not be revoked.");
      setStatusMessage("The delegation has been revoked.");
      setConfirmRevokeGrantId(null);
      await refreshGrants();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The delegation could not be revoked.");
    } finally {
      setBusyGrantId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Family and permissions</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">Family & access</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#74857F]">Review the verified delegation requests and access grants that involve your patient identity.</p>
      </header>
      <section className="rounded-2xl border border-[#DCEAE5] bg-[#EDF6F2] p-5">
        <h2 className="font-semibold text-[#31534B]">Access is scope-specific</h2>
        <p className="mt-2 text-sm leading-6 text-[#647C73]">A family relationship by itself does not grant access to another patient’s data. Booking appointments does not automatically grant access to medical records or diagnostic results. Only the exact active scopes shown below are used by the server.</p>
      </section>
      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}
      {statusMessage ? <p role="status" className="rounded-2xl border border-[#D2E7DC] bg-[#F0F8F3] p-4 text-sm font-medium text-[#34765E]">{statusMessage}</p> : null}
      {isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-white" /> : null}
      {!isLoading && !errorMessage && grants.length === 0 ? (
        <section className="rounded-2xl border border-[#E3ECE8] bg-white p-7">
          <h2 className="font-semibold text-[#334D47]">No delegation requests or access grants</h2>
          <p className="mt-2 text-sm leading-6 text-[#7B8B85]">No active or pending delegation grants are currently linked to this patient identity. Family relationship records and new delegation setup are managed through the clinic’s verified process.</p>
        </section>
      ) : null}
      <div className="grid gap-4">
        {grants.map((grant) => {
          const other = getOtherPerson(grant);
          const isBusy = busyGrantId === grant.id;
          return (
            <article key={grant.id} className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#2D4943]">{other.firstName} {other.lastName}</h2>
                  <p className="mt-1 text-sm text-[#788982]">{grant.direction === "OUTGOING" ? "You are the patient sharing access" : "Access to this patient is shared with you"}</p>
                  <p className="mt-2 text-xs text-[#8A9993]">{humanizePortalValue(grant.relationshipType)}{grant.isLegalGuardian ? " · Legal guardian relationship recorded" : ""}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${grant.status === "ACTIVE" ? "bg-[#E9F5EF] text-[#34765E]" : grant.status === "PENDING" ? "bg-[#FFF5E5] text-[#8B6A2D]" : "bg-[#F0F3F1] text-[#667A73]"}`}>{humanizePortalValue(grant.status)}</span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#8A9993]">Granted scopes</p>
                  {grant.scopes.length ? <ul className="mt-2 flex flex-wrap gap-2">{grant.scopes.map((scope) => <li key={scope} className="rounded-lg bg-[#F1F6F3] px-3 py-2 text-xs font-medium text-[#49655C]">{SCOPE_LABELS[scope] || humanizePortalValue(scope)}</li>)}</ul> : <p className="mt-2 text-sm text-[#7B8B85]">No scopes listed.</p>}
                </div>
                <div className="grid gap-3 text-sm">
                  <p><span className="text-[#8A9993]">Requested: </span><span className="font-medium text-[#526A62]">{formatPortalDate(grant.requestedAt)}</span></p>
                  <p><span className="text-[#8A9993]">Approved: </span><span className="font-medium text-[#526A62]">{formatPortalDate(grant.approvedAt)}</span></p>
                  <p><span className="text-[#8A9993]">Expires: </span><span className="font-medium text-[#526A62]">{formatPortalDate(grant.expiresAt)}</span></p>
                </div>
              </div>
              {grant.canDecide || grant.canRevoke ? <div className="mt-5 flex flex-wrap gap-2 border-t border-[#EEF2F0] pt-4">
                {grant.canDecide ? <>
                  <button type="button" onClick={() => decideGrant(grant.id, "APPROVE")} disabled={isBusy} className="min-h-10 rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white disabled:opacity-50">{isBusy ? "Saving…" : "Approve request"}</button>
                  <button type="button" onClick={() => decideGrant(grant.id, "REJECT")} disabled={isBusy} className="min-h-10 rounded-xl border border-[#E8C9C0] px-4 text-sm font-semibold text-[#A15B4C] disabled:opacity-50">Reject request</button>
                </> : null}
                {grant.canRevoke ? <button type="button" onClick={() => setConfirmRevokeGrantId((current) => current === grant.id ? null : grant.id)} disabled={isBusy} className="min-h-10 rounded-xl border border-[#E8C9C0] px-4 text-sm font-semibold text-[#A15B4C] disabled:opacity-50">{confirmRevokeGrantId === grant.id ? "Close" : "Revoke access"}</button> : null}
              </div> : null}
              {confirmRevokeGrantId === grant.id ? <div className="mt-4 rounded-xl border border-[#F0D7CF] bg-[#FFF8F5] p-4">
                <p className="text-sm font-semibold text-[#8C5142]">Revoke this delegation?</p>
                <p className="mt-1 text-sm text-[#9B6A5E]">The other account will lose the scopes shown above. A new grant must follow the clinic verification process.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => revokeGrant(grant.id)} disabled={isBusy} className="min-h-10 rounded-lg bg-[#A65C4A] px-4 text-sm font-semibold text-white disabled:opacity-50">{isBusy ? "Revoking…" : "Confirm revocation"}</button>
                  <button type="button" onClick={() => setConfirmRevokeGrantId(null)} className="min-h-10 rounded-lg border border-[#E8C9C0] px-4 text-sm font-semibold text-[#8C5142]">Keep access</button>
                </div>
              </div> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
