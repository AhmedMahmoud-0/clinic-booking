# Apply MERUNO Update 75 — Fix 01

## Purpose

This focused repair addresses the two lint errors and the patient-portal E2E assertion reported after Update 75.

## Files to replace

Replace only these three files from the ZIP:

- `src/components/patient-portal/appointment-detail-view.tsx`
- `src/components/patient-portal/family-access-view.tsx`
- `tests/e2e/patient-portal.spec.ts`

Do not replace any other Update 75 or project files.

## What changed

- Initial data loading now updates React state from the asynchronous fetch completion callback rather than synchronously through a loader invoked directly by `useEffect`.
- Explicit refresh functions remain available for user-triggered actions after cancellation, rescheduling, approval, rejection, or revocation.
- The E2E page-access test accepts both valid denial outcomes: anonymous users are redirected to `/login`, while a signed-in account without an active verified patient identity receives the dedicated `Patient access is not active` page. This reflects the existing authorization behavior and does not weaken API authorization.

## Not changed

- No authentication or authorization policy.
- No appointment cancellation or rescheduling rules.
- No Prisma schema, migration, seed, package file, dependency, or environment variable.
- No API route or response contract.

## Verify

Run:

```powershell
npm run lint
npx playwright test tests/e2e/patient-portal.spec.ts --workers=1 --reporter=list
```

Then confirm the original successful checks remain green:

```powershell
npm run typecheck
npm test
npm run build
```

The reported 1204 Vitest tests and production build were already successful before this repair. No claim is made that local verification has been run from this package.
