"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "../../lib/auth-client";
import styles from "../../app/login/login.module.css";

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

  if (submitted) return <p className={styles.registrationNote} role="status">If a MERUNO account exists for this email address, a password reset link has been sent. This response does not disclose whether an account exists.</p>;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}><label htmlFor="forgot-email">Email address</label><input id="forgot-email" className={styles.input} type="email" autoComplete="email" inputMode="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} /></div>
      {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
      <button className={styles.submitButton} type="submit" disabled={isSubmitting || !email.trim()}>{isSubmitting ? "Sending…" : "Send password reset link"}</button>
    </form>
  );
}
