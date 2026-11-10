# MERUNO Update 58 — Fix 01: Fractional Quantity Validation Test

## What this fix changes

The failing test accepted the fractional quantity `0.5` without supplying `quantityUnit`. The request schema intentionally requires a unit whenever a dispense quantity is provided, so the assertion was testing an incomplete request rather than the decimal rule.

This fix adds `quantityUnit: "tablets"` to that test case. It does not weaken validation or change runtime behavior.

## Files to replace

Replace only:

- `tests/unit/doctor-prescription-validation.test.ts`

No other file should be replaced.

## Database and dependencies

- No Prisma schema changes.
- No migration or database command.
- No Prisma Client generation.
- No dependency changes and no `npm install`.

Migration 11 from Update 58 is unaffected. This fix does not apply, revert, or modify it.

## Verification

Run:

```powershell
npm test -- tests/unit/doctor-prescription-validation.test.ts
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals remain 717 unit tests and 101 E2E tests, assuming no unrelated test changes.
