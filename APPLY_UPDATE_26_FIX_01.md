# Apply MERUNO Update 26 Fix 01 — E2E Origin Alignment

## Purpose

The employee-invitation acceptance E2E test returned `403` instead of the expected `401` because the test hard-coded `Origin: https://localhost:3100`, while the route validates the request origin against `BETTER_AUTH_URL`. The route rejected the origin before it reached the signed-out session check. The admin endpoint test did not expose this because its shared permission guard checks authentication before the route handler.

This fix makes the Playwright server URL and the test `Origin` derive from the same `BETTER_AUTH_URL` loaded from the project `.env` using Next.js' existing `@next/env` package. The server-side origin validation remains unchanged and is not weakened.

## Apply

1. Extract this ZIP into the existing `clinic-booking` project root.
2. Add/replace the following files:
   - Replace `playwright.config.ts`.
   - Replace `tests/e2e/employee-invitation.spec.ts`.
   - Replace `docs/implementation-roadmap.md`.
   - Replace `docs/authentication/phase-3g-b2-employee-invitations.md`.
3. Keep `.env`, `package.json`, `package-lock.json`, Prisma schema, migrations, generated client, local database, and all other project files unchanged.

## Environment behavior

- Playwright now loads the same development `.env` values as Next.js.
- `BETTER_AUTH_URL` becomes the canonical Playwright `baseURL`, webServer URL, and `Origin` header for the API tests.
- HTTP values start the dev server over HTTP. HTTPS values start it with Next.js experimental HTTPS and ignore the local certificate for browser tests.
- No `.env` value or secret is included in the ZIP. Do not share `BETTER_AUTH_SECRET` or `DATABASE_URL`.

The configured origin must be the exact origin used to open the local application. This is also the origin used when generating Better Auth email links and validating mutation requests.

## Dependencies and database

- No dependency installation is required. `@next/env` is already supplied by the installed Next.js package.
- No Prisma schema, migration, database, or generated-client changes.
- No change to the employee invitation server route, origin guard, session guard, permission model, or invitation business logic.

## Validation — exact order

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected test totals remain **64 unit tests and 17 E2E tests**. This package has not been run against the user's local project; local results are required before closing Phase 3G-B2.
