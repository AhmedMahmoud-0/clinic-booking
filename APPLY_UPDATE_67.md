# Apply Update 67 — Phase 8A–8C Internal Laboratory Workflow

## Before applying

1. Back up the `clinic-booking` project folder and confirm Update 66 Fix 01 is applied.
2. Stop the Next.js dev server.
3. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
4. Add the new files at their exact paths and replace only the files listed in `UPDATE_67_FILE_GUIDE.md`.
5. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, and the existing PostgreSQL database.
6. Do not run `db push`, `migrate dev`, `migrate reset`, seed commands, or migration-preview generation.

## Database and migration steps

Update 67 includes Migration 14:

`20261110233000_lab_sample_recollection_history`

Run these commands from the project root, in order:

```powershell
npm run db:validate
npm run db:generate
npm run db:migrate:status
```

Before applying, confirm the only pending migration is:

`20261110233000_lab_sample_recollection_history`

Then apply the reviewed migration:

```powershell
npx prisma migrate deploy --config=./prisma7.config.ts
npm run db:migrate:status
```

The final status must report that the database schema is up to date. If a different migration is pending, or the migration reports an error, stop and send the complete output. Do not use a destructive command to reconcile the database.

No seed command is required. No other migration is included in this update.

## Application checks

After the migration is confirmed up to date, run the five project checks in order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected incremental test totals, assuming the current Update 66 Fix 01 baseline remains unchanged:

- Unit: 1,034 tests across 93 files (44 new tests across 3 files).
- Playwright E2E: 146 tests (8 new tests).

These are expected totals, not a claim that they have already passed on the developer's machine. If any command fails, stop and send the full error/output before applying another update.

## Scope reminder

This is an API/data-layer increment for internal Lab Staff only. It ends with a `DRAFT` laboratory result. It does not implement result approval/release, critical-result communications, external laboratory handling, radiology workflows, or staff UI. Those remain in the planned Phase 8 increments.
