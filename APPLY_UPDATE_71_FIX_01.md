# MERUNO Update 71 — Fix 01

## Purpose

This repair addresses the two repeat failures reported after applying Update 71:

1. ESLint `react-hooks/set-state-in-effect` in the cashier invoice workbench.
2. Playwright timing out while waiting for the Next.js development server before any E2E test starts.

## Apply

1. Back up the current project folder.
2. Extract this ZIP into the project root and merge the two included paths, replacing the existing files:
   - `src/components/billing/cashier-invoice-workbench.tsx`
   - `playwright.config.ts`
3. Do not change Prisma schema, migrations, `.env`, `package.json`, or the lockfile.

## What changed

### Cashier workbench

`loadLists()` no longer updates React state before its first asynchronous boundary. It clears an old error only after both list requests have completed successfully. The initial effect-triggered load therefore does not synchronously schedule a state update.

### Playwright startup

The previous configuration waited 120 seconds and discarded the development server's standard output. The configuration now:

- allows up to 300 seconds for Next.js to become reachable, accommodating slow first-start/Turbopack compilation on the reported Windows filesystem;
- pipes both stdout and stderr so the actual Next.js readiness or startup error is visible if the server still does not become reachable;
- preserves the existing `BETTER_AUTH_URL`-derived protocol, hostname, port, baseURL, origin alignment, HTTPS handling, and existing server reuse behavior.

The longer timeout is not presented as proof that the server will start. The piped output is intentionally retained so a remaining startup failure has actionable evidence rather than only a generic timeout.

## Database

No schema changes and no migration. Do not run Prisma migration or database push commands for this fix.

## Validation

Run only the previously failing checks first:

```bash
npm run lint
npx playwright test --workers=1
```

Expected result:
- lint exits successfully;
- Playwright starts Next.js and proceeds to the E2E tests. If startup still times out, retain and send the complete `[WebServer]` output printed by this configuration; it will now include stdout as well as stderr.

Do not rerun typecheck, unit tests, or build at this first stage; those passed for Update 71 before this focused repair. After these two checks pass, run the full verification sequence required to close Update 71.
