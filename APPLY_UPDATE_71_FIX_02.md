# MERUNO Update 71 — Fix 02

This fix addresses the remaining Update 71 verification findings after Fix 01.

## Files

- `src/components/billing/cashier-invoice-workbench.tsx` — split list fetching from React state updates. The mount/search effect now updates state only in asynchronous promise callbacks; user-triggered refreshes continue to use the existing `loadLists` flow.
- `playwright.config.ts` — start the Next.js 16 test server using the documented Webpack dev-server option. The previous run showed Turbopack cache database compaction taking multiple minutes and delaying route compilation/requests. Keep the validated `BETTER_AUTH_URL`, HTTPS mode, and 300-second server startup timeout.
- `src/app/api/public/appointment-availability/route.ts` — retain the generic public 500 response, while logging only the unexpected error name and Prisma/ORM error code on the server. This makes the observed 500 diagnosable without exposing internal details to the public response.

## Apply

1. Back up the project.
2. Extract this ZIP at the project root and overwrite only the three paths listed above.
3. No database schema or migration changes are included.

## Verify

Run the checks that failed in the previous attempt:

```bash
npm run lint
npx playwright test --workers=1
```

The Playwright server command is now `npx next dev --webpack ...`; the server banner should identify Webpack rather than Turbopack. The expected performance symptom to disappear is the multi-minute Turbopack filesystem-cache compaction. If the availability test still returns 500, the server log will now include a safe diagnostic error name/code immediately before the generic response. Do not treat a 500 as resolved unless the E2E test passes.
