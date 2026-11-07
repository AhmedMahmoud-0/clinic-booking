"use client";

import { useState, type FormEvent } from "react";
import styles from "../../app/login/login.module.css";

interface AccountEmailChangeFormProps {
  currentEmail: string;
}

export function AccountEmailChangeForm({ currentEmail }: AccountEmailChangeFormProps) {
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/email-change/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const error = typeof payload === "object" && payload !== null && "error" in payload
          ? (payload as { error?: { message?: string } }).error?.message
          : null;
        setErrorMessage(error || "The email-change request could not be completed. Try again.");
        return;
      }
      setNewEmail("");
      setMessage("A confirmation link was sent to your current email address. Your sign-in email will remain unchanged until both addresses are confirmed.");
    } catch {
      setErrorMessage("The email-change request is temporarily unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="account-current-email">Current sign-in email</label>
        <input id="account-current-email" className={styles.input} type="email" value={currentEmail} readOnly disabled />
      </div>
      <div className={styles.field}>
        <label htmlFor="account-new-email">New email address</label>
        <input id="account-new-email" className={styles.input} type="email" autoComplete="email" maxLength={254} value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required disabled={isSubmitting} />
      </div>
      {message ? <p className={styles.registrationNote} role="status">{message}</p> : null}
      {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
      <button className={styles.submitButton} type="submit" disabled={isSubmitting || !newEmail.trim()}>
        {isSubmitting ? "Sending…" : "Request email change"}
      </button>
    </form>
  );
}
