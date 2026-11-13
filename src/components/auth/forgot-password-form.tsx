"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "../../lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSubmitting(true); setErrorMessage(null);
    try {
      const result = await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo: "/reset-password" });
      if (result.error) { setErrorMessage("The reset request could not be completed. Check the email delivery setup and try again."); return; }
      setSubmitted(true);
    } catch { setErrorMessage("The reset request is temporarily unavailable. Please try again."); }
    finally { setIsSubmitting(false); }
  }
  if (submitted) return <div className="rounded-2xl border border-[#CDE5D8] bg-[#F1FAF5] p-4 text-sm leading-7 text-[#315F4D]" role="status">If a MERUNO account exists for this email address, a password reset link has been sent. This response does not disclose whether an account exists.</div>;
  return (
    <form className="grid w-full gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-2"><label htmlFor="forgot-email" className="text-[0.82rem] font-bold text-[#344B46]">Email address</label><input id="forgot-email" className="min-h-[52px] w-full rounded-xl border border-[#D9E5E0] bg-white px-4 text-sm text-[#233B39] outline-none transition placeholder:text-[#9AA9A3] focus:border-[#176B67] focus:ring-4 focus:ring-[#176B67]/10" type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} /></div>
      {errorMessage ? <p className="rounded-xl border border-[#EFCBC7] bg-[#FFF7F6] px-4 py-3 text-sm text-[#9D3029]" role="alert">{errorMessage}</p> : null}
      <button className="inline-flex min-h-[53px] w-full items-center justify-center rounded-xl bg-[#176B67] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#125A56] disabled:opacity-60" type="submit" disabled={isSubmitting || !email.trim()}>{isSubmitting ? "Sending…" : "Send password reset link"}</button>
    </form>
  );
}
