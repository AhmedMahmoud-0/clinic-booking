import "server-only";

import { headers } from "next/headers";

import { auth } from "./auth";

export type AuthSession = typeof auth.$Infer.Session;

/** Return the current validated Better Auth session, or null when signed out. */
export async function getAuthSession(): Promise<AuthSession | null> {
  return auth.api.getSession({
    headers: await headers(),
  });
}
