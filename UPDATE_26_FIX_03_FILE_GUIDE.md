# Update 26 Fix 03 — File Guide

| File | Action | Purpose |
|---|---|---|
| `playwright.config.ts` | Replace | Changes the Playwright web-server readiness URL from `/` to `/login`, ensuring Next.js compiles the first E2E route before tests start. All URL derivation, environment loading, HTTPS handling, and timeout settings remain intact. |
| `docs/implementation-roadmap.md` | Replace | Records Fix 03 and keeps Phase 3G-B2 open pending full local validation. |
| `docs/authentication/phase-3g-b2-employee-invitations.md` | Replace | Documents the cold-route compilation diagnosis and the readiness-probe change. |
| `APPLY_UPDATE_26_FIX_03.md` | Add | Application steps, scope, and validation sequence. |

No source login component, test file, API route, database file, or environment file is changed.
