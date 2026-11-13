# MERUNO Update 75 — Fix 02: Patient Portal E2E Redirect Assertion

## Why this fix is needed

The local run confirms that TypeScript and ESLint pass after Fix 01. The remaining Playwright failure is in the test assertion: it expected a dedicated “Patient access is not active” page for some routes even though the test has no authenticated session. In the actual anonymous run, the protected layout redirects all patient portal pages to `/login`.

The test also checked `page.url()` immediately after `DOMContentLoaded`, which can happen before the streamed Next.js redirect has completed.

## Apply

Replace only:

- `tests/e2e/patient-portal.spec.ts`

No application code, authorization policy, API route, database schema, migration, dependency, or environment file changes are included.

## Verification

Run:

```powershell
npx playwright test tests/e2e/patient-portal.spec.ts --workers=1 --reporter=list
```

The first test now waits for the final `/login` URL on every protected portal page. The second test remains unchanged and still verifies anonymous API requests return HTTP 401 with `Cache-Control: no-store`.
