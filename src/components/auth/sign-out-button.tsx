"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasError, setHasError] = useState(false);
  async function handleSignOut() {
    setIsSigningOut(true); setHasError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) { setHasError(true); return; }
      router.replace("/login"); router.refresh();
    } catch { setHasError(true); }
    finally { setIsSigningOut(false); }
  }
  return <span className="inline-flex flex-wrap items-center gap-3"><button className="min-h-9 rounded-full border border-[#DCE8E3] px-4 text-sm font-semibold text-[#526C64] transition hover:border-[#B8D4C9] hover:bg-[#F5FAF7] disabled:opacity-60" type="button" onClick={handleSignOut} disabled={isSigningOut}>{isSigningOut ? "Signing out…" : "Sign out"}</button>{hasError ? <span className="text-xs text-[#9D3029]" role="alert">Sign-out failed. Please try again.</span> : null}</span>;
}
