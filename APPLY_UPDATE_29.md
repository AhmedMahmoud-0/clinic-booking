# Apply Update 29 — Phase 4B1

## Prerequisite

Apply this package to the project after Update 28 and Fix 01. The developer confirmed that Phase 4A left the local database with three applied migrations and `Database schema is up to date!`.

This update adds a fourth migration. Keep `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, all existing migrations, and the local PostgreSQL database intact.

## Files to add

1. `prisma/migrations/20261108000000_add_clinic_working_hours/migration.sql`
2. `src/lib/clinic-time.ts`
3. `tests/unit/clinic-working-hours-migration.test.ts`
4. `tests/unit/clinic-time.test.ts`
5. `docs/database/phase-4b-clinic-working-hours.md`

## Files to replace

1. `prisma/schema.prisma`
2. `README.md`
3. `docs/implementation-roadmap.md`

## What changes

- Add `ClinicWeeklySchedule` for single-branch weekly opening intervals. Multiple non-overlapping intervals per weekday are supported, so split shifts and breaks can be represented.
- Add `ClinicScheduleException` for one-off `BLOCKED` closures and `EXTRA_HOURS` openings, reusing the current `ScheduleExceptionType` enum.
- Add an optional Employee creator relation for clinic schedule exceptions.
- Add PostgreSQL minute/date/time checks and GiST exclusion constraints for overlapping active weekly windows and overlapping exception windows.
- Add a shared `Africa/Cairo` time-zone conversion helper. Weekly schedules use clinic-local wall-clock minutes; exception timestamps are instants.
- Retain the existing doctor weekly schedule and doctor exception models and their current constraints without modifying existing rows.

## No invented operating hours

No clinic hours, holidays, closures, or doctor shifts are seeded. The approved scope does not establish the final operating hours or individual doctor rosters. An absent active weekly row means the weekday has no configured opening interval; it does not silently assume that the clinic is open.

## Migration procedure — do not skip

1. Confirm `.env` points to the intended local PostgreSQL database. Do not paste its connection string into chat.
2. Validate the Prisma schema and regenerate the Prisma Client:

   ```powershell
   npm run db:validate
   npm run db:generate
   ```

3. Review `prisma/migrations/20261108000000_add_clinic_working_hours/migration.sql`.
4. Check the current state:

   ```powershell
   npm run db:migrate:status
   ```

   Expected before applying: the previous three migrations are applied and `20261108000000_add_clinic_working_hours` is pending.
5. Apply the additive migration:

   ```powershell
   npx prisma migrate deploy --config=./prisma7.config.ts
   ```
6. Confirm the state:

   ```powershell
   npm run db:migrate:status
   ```

   Expected: four migrations found and `Database schema is up to date!`.

Do not run `db push`, `migrate reset`, `db:migration:preview`, the initial-schema generator, or the seed command for this update. Do not edit or remove any previous migration folder. If migration deployment fails, stop and send the complete error output; do not attempt a destructive repair.

## Application verification

After migration deployment succeeds, run these commands in this exact order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Baseline from the completed Phase 4A update is 89 unit tests and 22 E2E tests. This update adds 9 unit tests across two files. Expected totals: **98 unit tests and 22 E2E tests**.

## Dependencies and seed

- No `npm install` / `npm ci` required.
- No new package, environment variable, or seed change.
- `CLINIC_TIME_ZONE` is centralized in `src/lib/clinic-time.ts` as `Africa/Cairo`; this is not a secret or external provider setting.
- Do not run `npm run db:seed`; this migration intentionally creates no catalog or schedule rows.
