# MERUNO Update 28 — Phase 4A Consultation-Room Database Foundation

## Before applying

This package is for the current project after Update 27 (Phase 3G-C). The developer confirmed that the local database was up to date with two existing migrations. This update adds one new additive migration; it does not regenerate or replace the initial migration history.

Keep `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, and all existing migration folders unchanged.

## Files to add

1. `prisma/migrations/20261107230000_add_consultation_rooms/migration.sql`
2. `tests/unit/consultation-room-migration.test.ts`
3. `docs/database/phase-4a-consultation-rooms.md`

## Files to replace

1. `prisma/schema.prisma`
2. `README.md`
3. `docs/implementation-roadmap.md`

The replacement Prisma schema retains the existing Phase 2 domain models and Phase 3A authentication/authorization models, with only the `ConsultationRoom` model and optional appointment relation added.

## What changes

- Adds a distinct `ConsultationRoom` catalog model for outpatient consultation rooms.
- Adds nullable `Appointment.consultationRoomId` so historical/current appointments do not need a room assignment yet.
- Uses `ON DELETE RESTRICT` so a room referenced by appointments cannot be physically deleted. Rooms are deactivated through `isActive`.
- Adds a PostgreSQL GiST exclusion constraint to prevent overlapping active appointments from using the same consultation room. Intervals use `[)` semantics, so one visit may begin exactly when the previous visit ends.
- Leaves `RadiologyResource` unchanged. X-ray and ultrasound equipment/resources remain modality-specific and are not consultation rooms.
- Does not invent a consultation-room count or seed room records. The approved scope specifies eight doctors but does not establish a consultation-room count.

This is a database foundation only. Room CRUD screens belong to Phase 11; actual room assignment during booking belongs to Phase 6.

## Database migration procedure — do not skip

The last check from the developer showed the database up to date with two migrations. The new migration is additive and should become the third migration once applied.

1. Confirm `.env` points to the intended local PostgreSQL database. Do not paste the connection string into chat.
2. Validate the schema and regenerate the Prisma Client:

   ```powershell
   npm run db:validate
   npm run db:generate
   ```

3. Review `prisma/migrations/20261107230000_add_consultation_rooms/migration.sql`.
4. Check the current migration state:

   ```powershell
   npm run db:migrate:status
   ```

   Expected before applying: the existing two migrations are applied and the new `20261107230000_add_consultation_rooms` migration is pending.

5. Apply the additive migration:

   ```powershell
   npx prisma migrate deploy --config=./prisma7.config.ts
   ```

6. Confirm the migration history is clean:

   ```powershell
   npm run db:migrate:status
   ```

   Expected: `Database schema is up to date!` with three migrations found.

Do not run `db push`, `migrate reset`, `db:migration:preview`, or the initial-schema generator for this update. Do not delete or edit prior migration directories. If migration deployment fails, stop and send the complete error output; do not try destructive repair commands.

## Application verification

After migration deployment succeeds, run these commands in this exact order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Baseline from the completed Phase 3G-C update: 86 unit tests and 22 E2E tests. This update adds one unit test file containing 3 migration-contract tests. Expected totals: 89 unit tests and 22 E2E tests.

The unit tests inspect the migration contract only; they do not replace running the PostgreSQL migration on the local database.

## No dependency or seed changes

- No `npm install` / `npm ci` required.
- No new dependency or environment variable.
- No seed run required.
- No patient, employee, doctor, service, laboratory, radiology, or appointment records are inserted or modified by the migration.
