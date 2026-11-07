# MERUNO Testing Foundation

## Test layers

MERUNO uses two focused test layers:

- **Vitest** for fast, pure unit tests under `tests/unit/`.
- **Playwright** for real-browser end-to-end checks under `tests/e2e/`.

The initial setup intentionally does not add jsdom, React Testing Library, coverage providers, or a CI workflow. The current public page is a Server Component, and Next.js recommends E2E coverage for asynchronous Server Components while unit testing the small pure helpers directly.

## One-time setup

Use Node.js 22.12 or newer.

After applying Update 04:

```bash
npm install
npm run test:e2e:install
```

`npm install` updates the existing `package-lock.json` consistently with the new test dependencies. Keep the resulting lockfile and commit it with the package manifest when the Git workflow is ready.

Chromium is the only configured browser project to keep the local setup and download size modest. The browser binary is stored outside the source tree; it is not part of the update ZIP.

## Commands

```bash
npm test
npm run test:watch
npm run test:e2e
```

- `npm test` runs the Vitest suite once and exits.
- `npm run test:watch` starts Vitest watch mode.
- `npm run test:e2e` lets Playwright start the Next.js development server on `http://127.0.0.1:3100`, waits for it, then runs Chromium tests. It does not use or replace the usual development server on port 3000.

The Playwright `webServer` setting reuses an existing server on port 3100 when not running in CI. If port 3100 is occupied by an unrelated process, stop that process or adjust the port consistently in `playwright.config.ts`.

## Initial unit coverage

- `tests/unit/utils.test.ts` checks that the shared `cn` helper combines class names and omits false conditional values.
- `tests/unit/validate-input.test.ts` checks successful Zod parsing/transforms and safe error-tree behavior from `validateInput`.

These tests intentionally exercise pure helpers. They do not test React rendering or database access.

## Initial browser coverage

- `tests/e2e/public-site.spec.ts` verifies the public homepage heading, demo notice, skip link, and English/LTR document attributes.
- It checks horizontal overflow at narrow mobile viewport widths (320, 360, and 390 CSS pixels).
- It checks that `GET /api/health` returns the expected 200 or 503 response contract and a `no-store` cache header. A 503 is accepted by this contract test because it represents a reachable endpoint with an unavailable database; use `npm run health:check` when specifically requiring a healthy local database.

The test does not inspect or print environment variables or connection details.

## Output and safety

Playwright writes reports to `playwright-report/` and run artifacts to `test-results/`; both are already ignored by `.gitignore`. Vitest runs without persistent output by default.

Do not place real patient data, secrets, database URLs, tokens, or passwords in test fixtures, snapshots, traces, or screenshots. Use synthetic values only.

CI is intentionally deferred until the repository/deployment provider is selected. The tests should run locally first.
