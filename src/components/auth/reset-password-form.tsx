"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "../../lib/auth-client";
import styles from "../../app/login/login.module.css";

interface ResetPasswordFormProps { token: string | null; tokenError: string | null; }

export function ResetPasswordForm({ token, tokenError }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!token || tokenError) return <div><p className={styles.errorMessage} role="alert">This password reset link is invalid or has expired. Request a new link to continue.</p><Link className={styles.homeLink} href="/forgot-password">Request another reset link</Link></div>;

  // Capture the narrowed token outside the async handler so TypeScript keeps it non-null.
  const resetToken = token;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setErrorMessage(null);
    if (password !== confirmPassword) { setErrorMessage("The passwords do not match."); return; }
    setIsSubmitting(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token: resetToken });
      if (result.error) { setErrorMessage("The reset link could not be used. Request a new link and try again."); return; }
      setIsComplete(true);
    } catch { setErrorMessage("Password reset is temporarily unavailable. Please try again."); }
    finally { setIsSubmitting(false); }
  }

  if (isComplete) return <div><p className={styles.registrationNote} role="status">Your password has been changed. Other active sessions have been revoked. Sign in again with your new password.</p><Link className={styles.homeLink} href="/login">Go to sign in</Link></div>;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}><label htmlFor="reset-password">New password</label><input id="reset-password" className={styles.input} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} /></div>
      <div className={styles.field}><label htmlFor="reset-confirm-password">Confirm new password</label><input id="reset-confirm-password" className={styles.input} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isSubmitting} /></div>
      {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
      <button className={styles.submitButton} type="submit" disabled={isSubmitting || password.length < 12 || !confirmPassword}>{isSubmitting ? "Updating password…" : "Update password"}</button>
    </form>
  );
}
