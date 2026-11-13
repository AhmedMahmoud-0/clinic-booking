"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "../../lib/auth-client";

interface ResetPasswordFormProps {
  token: string | null;
  tokenError: string | null;
}

const fieldClass =
  "min-h-[52px] w-full rounded-xl border border-[#D9E5E0] bg-white px-4 text-sm text-[#233B39] outline-none transition focus:border-[#176B67] focus:ring-4 focus:ring-[#176B67]/10";

export function ResetPasswordForm({ token, tokenError }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!token || tokenError) {
    return (
      <div className="grid gap-4">
        <p
          className="rounded-xl border border-[#EFCBC7] bg-[#FFF7F6] px-4 py-3 text-sm leading-6 text-[#9D3029]"
          role="alert"
        >
          This password reset link is invalid or has expired. Request a new link to continue.
        </p>
        <Link className="font-bold text-[#176B67] hover:underline" href="/forgot-password">
          Request another reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    // Re-check inside the event handler so TypeScript can safely narrow the
    // nullable URL token captured by this callback.
    const resetToken = token;
    if (!resetToken) {
      setErrorMessage("This password reset link is invalid or has expired. Request a new link to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token: resetToken,
      });

      if (result.error) {
        setErrorMessage("The reset link could not be used. Request a new link and try again.");
        return;
      }

      setIsComplete(true);
    } catch {
      setErrorMessage("Password reset is temporarily unavailable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <div className="grid gap-4">
        <p
          className="rounded-2xl border border-[#CDE5D8] bg-[#F1FAF5] p-4 text-sm leading-7 text-[#315F4D]"
          role="status"
        >
          Your password has been changed. Other active sessions have been revoked. Sign in again with your new password.
        </p>
        <Link className="font-bold text-[#176B67] hover:underline" href="/login">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="grid w-full gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label htmlFor="reset-password" className="text-[0.82rem] font-bold text-[#344B46]">
          New password
        </label>
        <input
          id="reset-password"
          className={fieldClass}
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

      <div className="grid gap-2">
        <label htmlFor="reset-confirm-password" className="text-[0.82rem] font-bold text-[#344B46]">
          Confirm new password
        </label>
        <input
          id="reset-confirm-password"
          className={fieldClass}
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

      {errorMessage ? (
        <p
          className="rounded-xl border border-[#EFCBC7] bg-[#FFF7F6] px-4 py-3 text-sm text-[#9D3029]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        className="inline-flex min-h-[53px] w-full items-center justify-center rounded-xl bg-[#176B67] px-5 text-sm font-extrabold text-white transition hover:bg-[#125A56] disabled:opacity-60"
        type="submit"
        disabled={isSubmitting || password.length < 12 || !confirmPassword}
      >
        {isSubmitting ? "Updating password…" : "Update password"}
      </button>
    </form>
  );
}
