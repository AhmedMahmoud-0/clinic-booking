# MERUNO Update 19 — Playwright HTTPS E2E Fix

## Why this update is needed

The application is now served over HTTPS locally, but the existing Playwright configuration still probes `http://127.0.0.1:3100`. Its webServer readiness check therefore waits for a URL that does not match the HTTPS development server and times out.

## Apply

Replace only this file:

- `playwright.config.ts`

Do not modify `.env`, Prisma schema, migrations, database contents, or package dependencies.

The updated configuration:

- Uses `https://localhost:3100` consistently as both the webServer readiness URL and browser `baseURL`.
- Uses `localhost` as the server hostname so the development certificate host matches the URL.
- Sets `ignoreHTTPSErrors: true` for Playwright's webServer readiness check and browser contexts because Next.js creates a self-signed local development certificate.
- Retains the existing tests, timeouts, browser project, reporters, and port.

## Important prerequisite

The project's `dev` script must start Next.js with `--experimental-https`, for example:

`"dev": "next dev --experimental-https"`

If that is already the current script, do not change it.

## Run

```powershell
npm run test:e2e
```

Then, once E2E passes, the existing `npm run build` result remains valid; no database migration is needed for this fix.
