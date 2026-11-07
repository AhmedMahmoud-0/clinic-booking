# Update 26 Fix 02 — File Guide

| Path | Action | Purpose |
|---|---|---|
| `playwright.config.ts` | Replace | Replaces the failing named ESM import from `@next/env` with `createRequire` from `node:module`. It loads `.env` through Next's existing `loadEnvConfig`, then derives Playwright's URL/protocol/port from `BETTER_AUTH_URL`. |
| `tests/e2e/employee-invitation.spec.ts` | Replace | Retains the E2E test that sends the normalized configured Origin and expects `401` for a signed-out identity. This keeps the test aligned with the config contract from Fix 01. |
| `docs/implementation-roadmap.md` | Replace | Records Fix 02 and keeps Phase 3G-B2 pending local verification. |
| `docs/authentication/phase-3g-b2-employee-invitations.md` | Replace | Explains the module-loader failure and the CommonJS-compatible loading correction. |
| `APPLY_UPDATE_26_FIX_02.md` | Add | Exact application steps, scope, and validation sequence. |

## Important implementation note

The fix does not relax `assertAccountLinkOrigin()` or move the server's origin guard. It only fixes module loading in Playwright's configuration process. `BETTER_AUTH_URL` remains the single source of truth for the local application origin.
