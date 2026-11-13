# MERUNO Update 76 — Fix 01: Patient portal E2E navigation timeout

## Scope

This is a test-only adjustment. It does not change application pages, API handlers, authorization, database access, or business logic.

The anonymous browser test now waits for the navigation commit and then asserts that the protected portal route has redirected to `/login`. The test timeout accommodates a cold Next.js development compilation on the first navigation.

## Apply

1. Extract this ZIP at the project root.
2. Replace `tests/e2e/patient-portal-update76.spec.ts` with the included file.
3. Do not change any application source files.

## Verify

Run only the previously failing test:

```powershell
npx playwright test tests/e2e/patient-portal-update76.spec.ts --grep "patient portal pages require a verified patient session" --workers=1 --reporter=list
```

The other three tests in this spec already passed in the supplied run; there is no need to rerun typecheck, lint, unit tests, or build for this test-only change.
