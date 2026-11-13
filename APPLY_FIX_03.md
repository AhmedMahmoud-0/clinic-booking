# MERUNO Update 78 — Fix 03

## Purpose

Fixes the Reception complaint-intake E2E test's race condition. The previous test called `isVisible()` immediately after `domcontentloaded`; that is a synchronous visibility check and can return false before the page's server-rendered state is ready.

## Apply

1. Extract this ZIP at the project root.
2. Replace only `tests/e2e/clinic-manager-operations.spec.ts`.
3. Do not apply Fix 02 again after this package; this file includes the correct permission-aware assertions and the polling correction.
4. No application code, Prisma schema, migration, dependency, or environment file changes are included.

## Verify

```powershell
npx playwright test tests/e2e/clinic-manager-operations.spec.ts --workers=1 --reporter=list
```

The Reception route test now waits for one of three valid server outcomes: redirect to `/login`, authorized intake form, or explicit forbidden state. It verifies the complete form only for an actor who actually receives the intake permission, and verifies no form is present for a forbidden actor.
