# Apply Update 25 Fix 01 — E2E Authentication Entry

## Purpose

This is a narrow Playwright test correction for the two failures reported after Update 25. It does not change application authentication behavior.

## Apply

1. Keep the current project state with Update 25 already applied.
2. Extract this ZIP into the existing project root (`clinic-booking`) and merge folders.
3. Replace `tests/e2e/auth-entry.spec.ts` only.
4. Do not reapply Update 25 and do not replace other application files.

## What changed

- Login and mobile layout checks wait for `domcontentloaded`, rather than waiting for every resource and development-only asset to finish loading. Assertions remain locator-based and web-first.
- The account-status test explicitly clears browser cookies and verifies the context is anonymous before navigating to the protected page. This makes the unauthenticated precondition deterministic and checks the existing server redirect.
- The exact password textbox locator from Update 24 Fix 01 is preserved to avoid matching the “Show password” button.

`src/server/auth/session.ts` and `src/app/auth/account-status/page.tsx` are intentionally unchanged. The session helper already delegates to Better Auth using the current request headers, and the page already redirects when no session is returned. There is not enough evidence in the supplied failure output to justify changing production authentication code.

## Dependencies and database

- No dependency installation.
- No Prisma schema, migration, client generation, seed, or database changes.
- No environment changes.

## Validation — run in this exact order

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected test counts remain 51 unit tests and 14 E2E tests. The E2E suite should now pass all 14 tests. If the account-status test still remains on `/auth/account-status` after the browser cookies are explicitly cleared, capture that test's `error-context.md` and trace; that would indicate a server-side session-resolution issue and should be diagnosed before changing the guard.
