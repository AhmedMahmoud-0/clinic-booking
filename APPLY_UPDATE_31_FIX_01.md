# Update 31 — Fix 01: Doctor Specialty Input Contract

## Apply

Apply this patch over the project after Update 31. Add or replace the files at the exact paths in this ZIP.

### Replace

- `src/server/clinic-master-data/master-data-validation.ts`
- `tests/unit/clinic-master-data-validation.test.ts`

### Add

- `docs/master-data/phase-4c-doctor-specialty-input-contract.md`
- `UPDATE_31_FIX_01_FILE_GUIDE.md`
- `UPDATE_31_FIX_01_SUMMARY.txt`

## What changed

The `doctorSpecialtyReplaceSchema` now requires `doctorId`, matching the existing `PUT /api/clinic/master-data/doctor-specialties` route, which reads `input.doctorId` before invoking the service. The validation test that submits a valid doctor ID now passes, and a regression test confirms that omitting the target doctor ID is rejected.

## Database and dependencies

- No Prisma schema change.
- No migration and no database operation.
- No Prisma Client generation.
- No dependency installation.
- Preserve `.env`, `package.json`, `package-lock.json`, and every migration.

## Validation

Run in this exact order:

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run test:e2e`
5. `npm run build`

Expected after this fix: 131 Unit tests and 24 E2E tests pass. Typecheck, lint, and build should also pass.
