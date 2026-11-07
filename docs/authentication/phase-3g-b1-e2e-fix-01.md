# Phase 3G-B1 — E2E follow-up Fix 01

## Reported failures

After Update 25, the owner reported two E2E failures in `tests/e2e/auth-entry.spec.ts`:

1. The login-page test exceeded the 30-second test timeout, even though the captured page snapshot showed the complete login UI. The test used `page.goto()` with Playwright's default `load` wait condition. The development server also reported slow filesystem access. The test now waits for `domcontentloaded` and continues to use web-first locator assertions. It intentionally does not use `networkidle` or increase the global timeout.
2. The account-status test remained at `/auth/account-status` instead of redirecting to `/login`. The supplied page implementation already redirects when `getAuthSession()` is null, and the supplied session helper already passes current request headers to Better Auth. The test now explicitly clears cookies and asserts that the browser context contains none before requesting the protected page. This ensures the test is actually exercising the signed-out case.

## Production behavior intentionally unchanged

No change is made to `src/server/auth/session.ts` or `src/app/auth/account-status/page.tsx`. The failure log alone does not establish that either production file is defective. If the redirect test still fails after cookie clearing, its new trace and `error-context.md` are required to determine why Better Auth is resolving a session without browser cookies.

## Validation

The fix changes only Playwright test code. The owner must run all five project validation commands. Update 25 / Phase 3G-B1 remains pending until all checks pass.
