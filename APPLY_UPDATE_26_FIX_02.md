# Apply MERUNO Update 26 Fix 02 — Playwright ESM Environment Loading

## Why this fix is needed

After Fix 01, `npm run test:e2e` stopped before loading any tests with:

```text
SyntaxError: The requested module '@next/env' does not provide an export named 'loadEnvConfig'
```

The installed `@next/env` package is not exposing that member as a statically detectable named ESM export to Playwright's config loader. The previous `import { loadEnvConfig } from "@next/env"` therefore fails during config initialization.

Fix 02 changes only how the Playwright config loads that existing package: Node's `createRequire(import.meta.url)` loads its CommonJS-compatible interface, then calls `loadEnvConfig(process.cwd(), true)`. Playwright continues to derive its `baseURL`, web-server URL, protocol, and request `Origin` from the same `BETTER_AUTH_URL`.

## Apply

1. Extract this ZIP into the existing `clinic-booking` project root (the project with Update 26 and Fix 01 already applied).
2. Replace `playwright.config.ts`.
3. Replace `docs/implementation-roadmap.md` and `docs/authentication/phase-3g-b2-employee-invitations.md` with the documentation copies in this package.
4. Keep the existing `.env`, `package.json`, `package-lock.json`, Prisma schema, migrations, generated client, database, and invitation implementation unchanged.

## Scope

- No new dependency and no `npm install`.
- No changes to application API routes, authentication/session logic, CSRF/origin protection, invitation behavior, database schema, or migrations.
- No environment secret is included. Do not share `BETTER_AUTH_SECRET` or `DATABASE_URL`.

## Validation — exact order

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals remain **64 unit tests and 17 E2E tests**. The latest run passed typecheck, lint, 64/64 unit tests, and build; Playwright did not start because its config import failed. This package itself has not been executed against the user's local project, so the local rerun is required before closing Phase 3G-B2.
