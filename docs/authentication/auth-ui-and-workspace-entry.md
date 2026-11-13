# MERUNO — Authentication UI and post-sign-in navigation

## Scope

This correction restores a complete MERUNO authentication presentation for the existing login, registration, password recovery, password reset, email-verification, and account-security routes. It also changes the post-sign-in account-status step into a server-resolved workspace router.

## Post-sign-in behavior

- A verified account with exactly one authorized destination is redirected to that destination.
- A verified account with more than one implemented authorized destination receives a workspace chooser.
- A verified patient-only account is directed to `/portal`.
- A System Admin-only account is directed to `/system-admin`.
- An active employee role without an implemented landing route remains on an account-status message; no route is invented and no role is modified. An account without an active, verified patient or employee identity also remains restricted.
- Workspace links are derived from `getCurrentAuthActor()` and the existing `canAccessEmployeeWorkspace()` policy. Each workspace still enforces its own server-side guard.

## Security boundaries

- Only implemented destinations are registered: `/system-admin`, `/clinic-manager`, and `/portal`. No route is invented for staff workspaces that are not present as page routes in the current application build.
- No role or workspace is accepted from a browser-supplied value.
- This change does not grant, create, or modify roles, employee links, patient links, or medical-record permissions.
- The System Admin workspace continues to enforce its existing workspace guard.
- Patient record access continues to require the existing exact-scope authorization checks.

## Files changed

- `src/app/login/login.module.css` — replaced with a shared responsive visual system for all existing auth lifecycle pages and account status.
- `src/app/auth/account-status/page.tsx` — resolves and redirects to the single authorized destination or displays a chooser when multiple destinations exist.
- `src/server/auth/authorization/post-sign-in-destination.ts` — derives workspace destinations from the existing authorization policy.
- `tests/unit/post-sign-in-destination.test.ts` — covers System Admin, Patient, multi-workspace, no-identity, and Radiologist routing.
- `tests/e2e/auth-entry.spec.ts` — verifies auth layout styling, route entry links, mobile overflow, and anonymous account-status protection.

## Database and dependencies

No database schema or data change. No migration, seed, dependency, package script, or environment-variable change.
