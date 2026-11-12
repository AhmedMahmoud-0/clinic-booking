# Update 68 — Fix 01: Missing LabOrderItem ID schema export

## Cause
The Update 68 submit-result route imports `labOrderItemIdSchema` from `lab-result-review-validation.ts`, but that module did not export it. The resulting Next.js module-resolution failure caused the route to compile as HTTP 500 and stopped the Playwright E2E run.

## Files in this fix
- `src/server/laboratory/lab-result-review-validation.ts`: re-exports the existing canonical `labOrderItemIdSchema` from Phase 8A-C's `lab-workflow-validation.ts`. This preserves the existing `trim().min(1).max(80)` validation instead of introducing a duplicate schema.
- `tests/unit/lab-result-review-validation.test.ts`: adds a regression test for the re-export and its existing validation behavior.

## Apply
1. Extract this ZIP into the project root and merge/overwrite the two files at the paths above.
2. Do not delete or replace any other files.
3. No Prisma schema change, migration, seed change, dependency change, or environment change is required.

## Verify
Run:

```bash
npm run typecheck
npm run lint
npm test
npx playwright test tests/e2e/lab-result-review.spec.ts --project=chromium --workers=1
npx playwright test --workers=1 --max-failures=1
```

Expected unit-test total is now 1,078 across 95 files (one regression test added). The full E2E suite remains 157 tests. The focused Lab Result Review E2E file should pass all 11 checks before rerunning the full suite.

If any command fails, stop and send the first complete error output. Do not change assertions to accept HTTP 500.
