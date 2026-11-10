# Apply MERUNO Update 59 — Fix 01 (Unused Import)

## Purpose
Remove the single ESLint warning in the Doctor laboratory catalog Route Handler.

## File to replace
- `src/app/api/doctor/lab-catalog/route.ts`

The unused `AccountLinkError` import is removed. `accountLinkJson` and `toAccountLinkErrorResponse` remain imported and used.

## Apply
1. Keep a backup/commit of the current project state.
2. Extract this ZIP into the existing `clinic-booking` project root.
3. Replace only the one file listed above.

## Database and dependencies
- No Prisma schema, migration, seed, or database changes.
- No Prisma Client generation is required.
- No dependency or package-script changes.
- Do not run `db push`, reset, or drop.

## Verify
```powershell
npm run lint
```

Then, to reconfirm the full Update 59 baseline:
```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
```
