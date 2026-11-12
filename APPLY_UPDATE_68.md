# Apply Update 68 — Phase 8D–8E Lab Result Approval and Critical Communication

## Before applying

1. Confirm Update 67 is applied and all five checks passed locally (1,034 unit tests, 146 E2E tests, typecheck, lint, production build).
2. Confirm Migration 14 is applied and `npm run db:migrate:status` reports the database is up to date.
3. Back up the existing `clinic-booking` folder and stop the Next.js dev server.
4. Extract this ZIP into the existing project root and merge folders.
5. Add the new files at their exact paths. Replace only `README.md` and `docs/implementation-roadmap.md` as listed in `UPDATE_68_FILE_GUIDE.md`.
6. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, `prisma/schema.prisma`, all migration folders, and the local PostgreSQL database.

## Database steps

**No Prisma schema change or migration is included.** This update reuses the LabResultReview, LabCriticalCommunication, and LabClinicalReview tables already present in the original schema.

Do not run `db push`, `migrate dev`, `migrate reset`, seed commands, migration-preview generation, or a new migration. `npm run db:validate` and `npm run db:generate` are not required for this update because the Prisma schema is unchanged.

## Application checks

Run from the project root in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the Update 67 baseline remains unchanged and no unrelated tests were added or removed:

- Unit: **1,077 tests across 95 files** (43 added in 2 new files).
- Playwright E2E: **157 tests** (11 added).

These are expected totals, not pre-verified results. If any command fails, stop and send the complete error output before applying Update 69.

## Scope boundaries

Update 68 adds API/data-layer functionality only. It does not add the Lab Staff or Doctor UI. It does not implement external-laboratory referrals or outside-patient intake; those are grouped with radiology scheduling and preparation in Update 69. It does not add radiology exam/report functionality, patient portal result screens, or billing.

The application remains a synthetic-data portfolio/demo and is not production clinical software.
