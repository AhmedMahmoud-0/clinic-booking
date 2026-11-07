"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "../../lib/auth-client";
import styles from "../../app/login/login.module.css";

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

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}><label htmlFor="account-current-password">Current password</label><input id="account-current-password" className={styles.input} type="password" autoComplete="current-password" maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required disabled={isSubmitting} /></div>
      <div className={styles.field}><label htmlFor="account-new-password">New password</label><input id="account-new-password" className={styles.input} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required disabled={isSubmitting} /></div>
      <div className={styles.field}><label htmlFor="account-confirm-password">Confirm new password</label><input id="account-confirm-password" className={styles.input} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isSubmitting} /></div>
      {message ? <p className={styles.registrationNote} role="status">{message}</p> : null}
      {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
      <button className={styles.submitButton} type="submit" disabled={isSubmitting || !currentPassword || newPassword.length < 12 || !confirmPassword}>{isSubmitting ? "Updating…" : "Change password"}</button>
    </form>
  );
}
