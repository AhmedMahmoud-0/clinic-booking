"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "../../lib/auth-client";
import styles from "../../app/login/login.module.css";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    setHasError(false);

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setHasError(true);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setHasError(true);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div>
      <button
        className={styles.signOutButton}
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>
      {hasError ? (
        <p className={styles.errorMessage} role="alert">
          Sign-out failed. Please try again.
        </p>
      ) : null}
    </div>
  );
}
