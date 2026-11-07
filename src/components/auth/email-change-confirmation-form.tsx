"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../../app/login/login.module.css";

interface EmailChangeConfirmationFormProps {
  step: string | undefined;
  userId: string | undefined;
  token: string | undefined;
  result: string | undefined;
}

export function EmailChangeConfirmationForm({ step, userId, token, result }: EmailChangeConfirmationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isCurrentStep = step === "current";
  const isNewStep = step === "new";

  if (result === "current-approved") {
    return <div className={styles.form}>
      <p className={styles.registrationNote} role="status">Your current email address has been approved. Open the verification link sent to your new email address to complete the change.</p>
      <Link className={styles.statusHomeLink} href="/login">Go to sign in</Link>
    </div>;
  }

  if (result === "completed") {
    return <div className={styles.form}>
      <p className={styles.registrationNote} role="status">Your sign-in email and linked clinic contact records have been updated. All active sessions were revoked; sign in again using the new email address.</p>
      <Link className={styles.statusHomeLink} href="/login">Sign in with the new email</Link>
    </div>;
  }

  if ((!isCurrentStep && !isNewStep) || !userId || !token) {
    return <div className={styles.form}>
      <p className={styles.errorMessage} role="alert">This email-change link is invalid or has expired. Start the process again from account security.</p>
      <Link className={styles.statusHomeLink} href="/auth/account-security">Back to account security</Link>
    </div>;
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const endpoint = isCurrentStep
        ? "/api/auth/email-change/approve-current"
        : "/api/auth/email-change/complete";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const error = typeof payload === "object" && payload !== null && "error" in payload
          ? (payload as { error?: { message?: string } }).error?.message
          : null;
        setErrorMessage(error || "This email-change link is invalid or has expired.");
        return;
      }

      router.replace(isCurrentStep
        ? "/auth/email-change?result=current-approved"
        : "/auth/email-change?result=completed");
    } catch {
      setErrorMessage("The confirmation could not be completed. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      <p className={styles.registrationNote}>
        {isCurrentStep
          ? "This confirms that you approve changing the current sign-in email. A second verification will then be sent to the new address."
          : "This verifies ownership of the new address. After confirmation, the sign-in email and linked employee/patient contact email will be synchronized in one database transaction."}
      </p>
      {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
      <button className={styles.submitButton} type="button" onClick={handleConfirm} disabled={isSubmitting}>
        {isSubmitting
          ? "Confirming…"
          : isCurrentStep ? "Approve email change" : "Verify new email address"}
      </button>
      <Link className={styles.statusHomeLink} href="/">MERUNO home</Link>
    </div>
  );
}
