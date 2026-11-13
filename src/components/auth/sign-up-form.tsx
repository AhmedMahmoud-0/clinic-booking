"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "../../lib/auth-client";

const fieldClass = "block min-h-[52px] w-full rounded-xl border border-[#D9E5E0] bg-white px-4 text-sm text-[#233B39] outline-none transition placeholder:text-[#9AA9A3] hover:border-[#B7CBC3] focus:border-[#176B67] focus:ring-4 focus:ring-[#176B67]/10 disabled:cursor-not-allowed disabled:bg-[#F6F8F7]";

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setErrorMessage(null);
    if (password !== confirmPassword) { setErrorMessage("The passwords do not match."); return; }
    setIsSubmitting(true);
    try {
      const result = await authClient.signUp.email({ name: name.trim(), email: email.trim().toLowerCase(), password, callbackURL: "/auth/verification-complete" });
      if (result.error) { setErrorMessage("We could not submit the registration. Check the details and try again."); return; }
      setIsComplete(true);
      setMessage("If this address can receive a new MERUNO account, a verification email has been sent. Verify the address before signing in.");
    } catch { setErrorMessage("Registration is temporarily unavailable. Please try again."); }
    finally { setIsSubmitting(false); }
  }

  async function handleResend() {
    setIsResending(true); setErrorMessage(null);
    setMessage("If the account exists and still needs verification, a new message will be sent.");
    try { await authClient.sendVerificationEmail({ email: email.trim().toLowerCase(), callbackURL: "/auth/verification-complete" }); }
    catch { /* Keep a generic response to avoid disclosing account existence. */ }
    finally { setIsResending(false); }
  }

  if (isComplete) return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-[#CDE5D8] bg-[#F1FAF5] p-4 text-sm leading-7 text-[#315F4D]" role="status">
        <span className="mb-2 grid size-9 place-items-center rounded-full bg-[#D8F0E2] text-lg font-bold text-[#176B67]">✓</span>
        {message}
      </div>
      <div className="rounded-2xl border border-[#E2ECE7] bg-[#F6FAF8] p-4 text-xs leading-6 text-[#647772]">
        Creating a sign-in account does not create or link a clinic patient record. Reception must verify and link the existing patient record before patient services become available.
      </div>
      {errorMessage ? <p className="rounded-xl border border-[#EFCBC7] bg-[#FFF7F6] px-4 py-3 text-sm text-[#9D3029]" role="alert">{errorMessage}</p> : null}
      <button className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#176B67] px-5 text-sm font-bold text-white transition hover:bg-[#125A56] disabled:opacity-60" type="button" onClick={handleResend} disabled={isResending}>{isResending ? "Sending…" : "Resend verification email"}</button>
      <Link className="text-center text-sm font-bold text-[#176B67] hover:underline" href="/login">Continue to sign in</Link>
    </div>
  );

  return (
    <form data-testid="sign-up-form" className="grid w-full gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2"><label htmlFor="register-name" className="text-[0.82rem] font-bold text-[#344B46]">Full name</label><input id="register-name" className={fieldClass} type="text" autoComplete="name" maxLength={200} placeholder="Your full name" value={name} onChange={(event) => setName(event.target.value)} required disabled={isSubmitting} /></div>
      <div className="grid gap-2"><label htmlFor="register-email" className="text-[0.82rem] font-bold text-[#344B46]">Email address</label><input id="register-email" className={fieldClass} type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} /></div>
      <div className="grid gap-2"><label htmlFor="register-password" className="text-[0.82rem] font-bold text-[#344B46]">Password</label><div className="relative"><input id="register-password" className={`${fieldClass} pr-20`} type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} placeholder="At least 12 characters" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 min-h-9 -translate-y-1/2 rounded-lg px-3 text-xs font-bold text-[#657C74] hover:bg-[#EDF5F2] hover:text-[#176B67]">{showPassword ? "Hide" : "Show"}</button></div></div>
      <div className="grid gap-2"><label htmlFor="register-confirm-password" className="text-[0.82rem] font-bold text-[#344B46]">Confirm password</label><div className="relative"><input id="register-confirm-password" className={`${fieldClass} pr-20`} type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} placeholder="Enter your password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isSubmitting} /><button type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-2 top-1/2 min-h-9 -translate-y-1/2 rounded-lg px-3 text-xs font-bold text-[#657C74] hover:bg-[#EDF5F2] hover:text-[#176B67]">{showConfirmPassword ? "Hide" : "Show"}</button></div></div>
      {errorMessage ? <p className="m-0 rounded-xl border border-[#EFCBC7] bg-[#FFF7F6] px-4 py-3 text-sm leading-6 text-[#9D3029]" role="alert">{errorMessage}</p> : null}
      <button className="mt-1 inline-flex min-h-[53px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#176B67] to-[#135B56] px-5 text-sm font-extrabold text-white shadow-[0_9px_20px_rgba(23,107,103,0.17)] transition hover:-translate-y-0.5 hover:shadow-[0_13px_24px_rgba(23,107,103,0.22)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#176B67] disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting || !name.trim() || !email.trim() || password.length < 12 || !confirmPassword}>{isSubmitting ? "Creating account…" : "Create patient account"}</button>
      <p className="m-0 rounded-2xl border border-[#E2ECE7] bg-[#F6FAF8] px-4 py-3 text-xs leading-6 text-[#647772]">Email verification is required. This form creates an authentication identity only; it does not create employee records, employee roles, or medical records.</p>
    </form>
  );
}
