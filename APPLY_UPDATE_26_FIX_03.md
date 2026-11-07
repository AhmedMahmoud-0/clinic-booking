# Apply MERUNO Update 26 Fix 03 — Warm the First E2E Route

## Diagnosis

The latest local run passed typecheck, lint, all 64 unit tests, and production build. Sixteen of seventeen E2E tests passed. Only the first direct visit to `/login` timed out. The page snapshot captured after the timeout included the expected `Welcome back` heading, and later login-related tests passed. The Playwright `webServer` readiness probe was checking only `/`, so the development server could be considered ready before Next.js had compiled `/login`.

## Change

The only runtime change is in `playwright.config.ts`:

```ts
webServer: {
  command: webServerCommand,
  url: `${baseURL}/login`,
  ignoreHTTPSErrors: true,
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
  stdout: "ignore",
  stderr: "pipe",
},
```

Playwright now waits for the login route itself to respond before beginning the suite. The existing `BETTER_AUTH_URL` still supplies the canonical host, protocol, and port. The per-test timeout and assertion timeout remain unchanged.

## Apply

1. Extract this ZIP into the current `clinic-booking` project root, after Update 26 Fix 02.
2. Replace `playwright.config.ts`.
3. Replace `docs/implementation-roadmap.md` and `docs/authentication/phase-3g-b2-employee-invitations.md` with the copies in this package.
4. Do not replace `.env`, `package.json`, `package-lock.json`, source login files, auth routes, Prisma files, migrations, generated client, or local database.

## Scope

- No dependency installation.
- No schema change or migration.
- No changes to login UI, Better Auth session logic, invitation API, same-origin protection, or any application route.
- No changes to E2E test or assertion timeouts.

## Validation — exact order

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals remain 64 unit tests and 17 E2E tests. The latest run before this fix had 64/64 unit tests and 16/17 E2E tests. The fix has not been run on the user's local machine; confirm the complete result locally before closing Phase 3G-B2.
