# Update 26 Fix 01 — File Guide

| Path | Action | Purpose |
|---|---|---|
| `playwright.config.ts` | Replace | Loads the existing Next.js development environment and derives Playwright's server origin, base URL, protocol, and port from `BETTER_AUTH_URL`. This prevents the test server and Better Auth origin guard from using different origins. |
| `tests/e2e/employee-invitation.spec.ts` | Replace | Removes the hard-coded `https://localhost:3100` Origin. The tests now send the exact normalized origin from `BETTER_AUTH_URL`, so the acceptance test reaches the session check and correctly expects `401` when signed out. |
| `docs/implementation-roadmap.md` | Replace | Records the E2E origin correction and keeps Phase 3G-B2 pending local re-validation. |
| `docs/authentication/phase-3g-b2-employee-invitations.md` | Replace | Documents the failure cause and the corrected Playwright/Better Auth origin alignment. |
| `APPLY_UPDATE_26_FIX_01.md` | Add | Application steps, scope, environment notes, and validation commands. |

## Why the route is not changed

`assertAccountLinkOrigin()` is intentionally retained before the session check. It rejects cross-origin mutation requests before any session-dependent mutation work. The failure was in the E2E test's hard-coded origin, not in the server guard. Moving or removing the server guard would conceal a local origin-configuration mismatch and weaken the intended CSRF boundary.
