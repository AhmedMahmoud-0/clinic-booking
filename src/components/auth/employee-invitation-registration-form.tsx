"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { authClient } from "../../lib/auth-client";
import styles from "../../app/login/login.module.css";

interface EmployeeInvitationRegistrationFormProps {
  email: string;
  employeeName: string;
}

export function EmployeeInvitationRegistrationForm({
  email,
  employeeName,
}: EmployeeInvitationRegistrationFormProps) {
  const [name, setName] = useState(employeeName);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email,
        password,
        callbackURL: "/auth/verification-complete",
      });

      if (result.error) {
        setErrorMessage("We could not create this sign-in identity. If you already have an account, sign in with the invited email address instead.");
        return;
      }

      setIsComplete(true);
    } catch {
      setErrorMessage("Registration is temporarily unavailable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    setIsResending(true);
    setResendMessage("If this address has an account that still needs verification, a new verification message will be sent.");
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: "/auth/verification-complete" });
    } catch {
      // Keep the same response so account existence is not disclosed.
    } finally {
      setIsResending(false);
    }
  }

  if (isComplete) {
    return (
      <div>
        <p className={styles.registrationNote} role="status">
          A verification message has been requested for {email}. Verify that address, then return to this invitation email and open its link again.
        </p>
        <p className={styles.registrationNote}>
          Email verification creates only a sign-in identity. The employee account is linked only after you sign in with this address and explicitly accept the invitation.
        </p>
        {resendMessage ? <p className={styles.registrationNote} role="status">{resendMessage}</p> : null}
        <button className={styles.submitButton} type="button" onClick={handleResendVerification} disabled={isResending}>{isResending ? "Sending…" : "Resend verification email"}</button>
        <Link className={styles.homeLink} href="/login">Continue to sign in</Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="employee-invitation-name">Full name</label>
        <input
          id="employee-invitation-name"
          className={styles.input}
          type="text"
          autoComplete="name"
          maxLength={200}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="employee-invitation-email">Invited email address</label>
        <input id="employee-invitation-email" className={styles.input} type="email" value={email} readOnly aria-readonly="true" />
      </div>
      <div className={styles.field}>
        <label htmlFor="employee-invitation-password">Create password</label>
        <input
          id="employee-invitation-password"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="employee-invitation-confirm-password">Confirm password</label>
        <input
          id="employee-invitation-confirm-password"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
      {resendMessage ? <p className={styles.registrationNote} role="status">{resendMessage}</p> : null}
      <button
        className={styles.submitButton}
        type="submit"
        disabled={isSubmitting || !name.trim() || password.length < 12 || !confirmPassword}
      >
        {isSubmitting ? "Creating sign-in identity…" : "Create sign-in identity"}
      </button>
      <p className={styles.registrationNote}>
        This invitation is required to link your sign-in identity to an existing employee record. It does not create an employee record or assign a role.
      </p>
      {errorMessage ? <button className={styles.homeLink} type="button" onClick={handleResendVerification} disabled={isResending}>{isResending ? "Sending…" : "Resend verification email"}</button> : null}
      <p className={styles.registrationNote}>Already have a MERUNO account? <Link href="/login">Sign in</Link>, then reopen this invitation email.</p>
    </form>
  );
}
