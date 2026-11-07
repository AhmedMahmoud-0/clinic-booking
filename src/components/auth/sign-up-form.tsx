"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "../../lib/auth-client";
import styles from "../../app/login/login.module.css";

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    <div>
      <p className={styles.registrationNote} role="status">{message}</p>
      <p className={styles.registrationNote}>Creating a sign-in account does not create or link a clinic patient record. Reception must verify and link the existing patient record before patient services become available.</p>
      <button className={styles.submitButton} type="button" onClick={handleResend} disabled={isResending}>{isResending ? "Sending…" : "Resend verification email"}</button>
      <Link className={styles.homeLink} href="/login">Continue to sign in</Link>
    </div>
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}><label htmlFor="register-name">Full name</label><input id="register-name" className={styles.input} type="text" autoComplete="name" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} required disabled={isSubmitting} /></div>
      <div className={styles.field}><label htmlFor="register-email">Email address</label><input id="register-email" className={styles.input} type="email" autoComplete="email" inputMode="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} /></div>
      <div className={styles.field}><label htmlFor="register-password">Password</label><input id="register-password" className={styles.input} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} /></div>
      <div className={styles.field}><label htmlFor="register-confirm-password">Confirm password</label><input id="register-confirm-password" className={styles.input} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isSubmitting} /></div>
      {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
      <button className={styles.submitButton} type="submit" disabled={isSubmitting || !name.trim() || !email.trim() || password.length < 12 || !confirmPassword}>{isSubmitting ? "Creating account…" : "Create patient sign-in account"}</button>
      <p className={styles.registrationNote}>Email verification is required. This form creates an authentication identity only; it does not create employee records, employee roles, or medical records.</p>
    </form>
  );
}
