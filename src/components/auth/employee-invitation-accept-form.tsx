"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "../../app/login/login.module.css";

interface EmployeeInvitationAcceptFormProps {
  employeeId: string;
  token: string;
}

export function EmployeeInvitationAcceptForm({ employeeId, token }: EmployeeInvitationAcceptFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleAccept() {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/employee-invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, token }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? "The invitation could not be accepted. Request a new invitation from the clinic administrator.");
        return;
      }

      router.replace("/auth/account-status");
      router.refresh();
    } catch {
      setErrorMessage("The invitation could not be accepted right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      <p className={styles.registrationNote}>
        Your verified sign-in email matches this invitation. Accepting it links this identity to the existing employee record; it does not create or change employee roles.
      </p>
      {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}
      <button className={styles.submitButton} type="button" onClick={handleAccept} disabled={isSubmitting}>
        {isSubmitting ? "Accepting invitation…" : "Accept employee invitation"}
      </button>
    </div>
  );
}
