"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "../../lib/auth-client";

export function AccountSecurityForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setErrorMessage(null);
    if (newPassword !== confirmPassword) { setErrorMessage("The new passwords do not match."); return; }
    setIsSubmitting(true);
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (result.error) { setErrorMessage("The password could not be changed. Check your current password and try again."); return; }
      setMessage("Password updated. Other active sessions have been revoked.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch { setErrorMessage("The password change is temporarily unavailable."); }
    finally { setIsSubmitting(false); }
  }
  const inputClass = "min-h-[52px] w-full rounded-xl border border-[#D9E5E0] bg-white px-4 text-sm text-[#233B39] outline-none transition focus:border-[#176B67] focus:ring-4 focus:ring-[#176B67]/10";
  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-2"><label htmlFor="account-current-password" className="text-[0.82rem] font-bold text-[#344B46]">Current password</label><input id="account-current-password" className={inputClass} type="password" autoComplete="current-password" maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required disabled={isSubmitting} /></div>
      <div className="grid gap-2"><label htmlFor="account-new-password" className="text-[0.82rem] font-bold text-[#344B46]">New password</label><input id="account-new-password" className={inputClass} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required disabled={isSubmitting} /></div>
      <div className="grid gap-2"><label htmlFor="account-confirm-password" className="text-[0.82rem] font-bold text-[#344B46]">Confirm new password</label><input id="account-confirm-password" className={inputClass} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isSubmitting} /></div>
      {message ? <p className="rounded-xl border border-[#CDE5D8] bg-[#F1FAF5] px-4 py-3 text-sm text-[#315F4D]" role="status">{message}</p> : null}
      {errorMessage ? <p className="rounded-xl border border-[#EFCBC7] bg-[#FFF7F6] px-4 py-3 text-sm text-[#9D3029]" role="alert">{errorMessage}</p> : null}
      <button className="inline-flex min-h-[53px] w-full items-center justify-center rounded-xl bg-[#176B67] px-5 text-sm font-extrabold text-white transition hover:bg-[#125A56] disabled:opacity-60" type="submit" disabled={isSubmitting || !currentPassword || newPassword.length < 12 || !confirmPassword}>{isSubmitting ? "Updating…" : "Change password"}</button>
    </form>
  );
}
