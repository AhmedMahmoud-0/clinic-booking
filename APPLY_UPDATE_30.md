# Apply Update 30 — Phase 4B2: Doctor schedule and clinic-hours integrity

## Prerequisite

Apply this update over the project after Update 29. The developer confirmed Phase 4B1 is complete: four migrations are applied and the database is up to date; typecheck, lint, 98 unit tests, 22 E2E tests, and production build passed.

## Files to add

1. `prisma/migrations/20261108010000_enforce_doctor_schedule_clinic_coverage/migration.sql`
2. `tests/unit/doctor-schedule-coverage-migration.test.ts`
3. `docs/database/phase-4b2-doctor-schedule-integrity.md`
4. `APPLY_UPDATE_30.md`
5. `UPDATE_30_FILE_GUIDE.md`
6. `UPDATE_30_SUMMARY.txt`

## Files to replace

1. `README.md`
2. `docs/implementation-roadmap.md`

Do **not** replace `prisma/schema.prisma`: all required schedule models already exist. No package files, auth files, application routes, or environment variables change.

## What this update enforces

- Active `DoctorWeeklySchedule` rows must fit fully inside one active `ClinicWeeklySchedule` interval with the same weekday and a covering effective-date range.
- Doctor `EXTRA_HOURS` exceptions must fit inside the clinic's normal weekly opening interval or a containing clinic `EXTRA_HOURS` exception. Weekly interval matching uses `Africa/Cairo` local time.
- A clinic `BLOCKED` exception overrides any doctor extra-hours window.
- One-off exceptions for the same doctor cannot overlap each other.
- Deferred PostgreSQL constraint triggers re-check dependent doctor rows when clinic weekly hours or clinic exceptions change. Related clinic and doctor changes can therefore be made in one transaction and validated at commit.
- A read-only migration preflight rejects inconsistent existing rows. The migration never repairs, rewrites, inserts, or deletes schedule/appointment data.

A doctor weekly schedule must be split into separate rows when a clinic day contains a break or when clinic opening-hour effective dates change. A schedule row must be contained by one clinic interval; several separate clinic intervals cannot be combined to cover one doctor row.

## Migration procedure — do not skip

1. Confirm `.env` points to the intended local PostgreSQL database. Do not share the connection string.
2. Review the new SQL file before applying it.
3. Check migration status:

   ```powershell
   npm run db:migrate:status
   ```

   Expected before applying: four migrations applied and `20261108010000_enforce_doctor_schedule_clinic_coverage` pending.
4. Apply the additive migration:

   ```powershell
   npx prisma migrate deploy --config=./prisma7.config.ts
   ```
5. Confirm the state:

   ```powershell
   npm run db:migrate:status
   ```

   Expected: five migrations found and `Database schema is up to date!`.

This update does not change Prisma models, so `db:validate` and `db:generate` are not required. No `npm install`, `db:seed`, `db push`, migration preview, or reset is required. Never delete or edit an earlier migration. If deployment fails during the read-only preflight or exclusion-constraint creation, stop and send the complete error output; do not manually alter schedule rows or use a destructive repair.

## Application verification

After the migration is applied, run these commands in this exact order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Baseline from completed Update 29: **98 unit tests and 22 E2E tests**. This update adds eight unit contract tests. Expected totals: **106 unit tests and 22 E2E tests**.

## Explicit scope boundary

This is the database-integrity foundation only. It does not add schedule-management routes/screens, set any doctor's hours, create appointments, generate booking slots, or add a multi-branch abstraction. Doctor schedule administration UI is part of Phase 11; appointment availability calculation belongs to Phase 6.
