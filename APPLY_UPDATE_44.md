# APPLY UPDATE 44 — Phase 6B3C: Audited patient-overlap exception

This patch introduces a narrowly scoped, Reception-only exception for exact same-patient appointment overlaps. It changes the Prisma schema and adds **migration 10**. Apply it only to the current verified Update 43 project state.

## 1. Back up the current state

1. Stop the local Next.js server and close any process that writes to the clinic database.
2. Create a full copy of the current `clinic-booking` project folder, including `.env`, `.git`, and the generated Prisma Client folder.
3. Take a PostgreSQL backup of the database that currently has migrations 1–9 applied. Do not continue without a usable backup.

## 2. Merge the patch

Extract the ZIP into the project root (`clinic-booking`) and merge the folders.

- Add every file listed under **New files** in `UPDATE_44_FILE_GUIDE.md`.
- Replace only the files listed under **Files to replace**.
- Do not delete, rename, or replace any other project file.
- Keep migrations 1–9 unchanged. Add migration 10 as a new folder only.

Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, or any existing migration.

## 3. Validate and generate Prisma Client

Run these commands from the project root, in this order:

```powershell
npm run db:validate
npm run db:generate
npm run db:migrate:status
```

Before applying the migration, the expected database state is:

- Migrations 1–9 are already applied.
- `20261109070000_audited_patient_overlap_exception` is the only pending migration (migration 10).

**Stop and share the full output** if schema validation or generation fails, if the database does not report migrations 1–9 as applied, or if any migration other than migration 10 is pending. Do not attempt to repair the state manually.

## 4. Apply migration 10

Only after the previous status matches exactly, run:

```powershell
npx prisma migrate deploy --config=./prisma7.config.ts
npm run db:migrate:status
```

The final status must report all 10 migrations applied and the database up to date.

Migration 10 replaces only the patient appointment-overlap exclusion with a deferred exact-pair guard. It does **not** drop or weaken the doctor or consultation-room overlap constraints. The migration adds an append-only exception table and a per-patient write mutex. Do not use `db push`, `migrate dev`, `migrate reset`, database reset, seed reruns, manual SQL edits, or destructive repair commands for this update.

If deploy fails or the final migration status is not up to date, stop. Keep the database and project backup intact and send the complete error output before making any other change.

## 5. Run the five project checks

After migration 10 is applied and status is up to date, run these commands in order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the current Update 43 baseline is unchanged:

- Unit tests: **425 passed across 47 files** (406 existing + 19 new).
- E2E tests: **53 passed** (existing suite retained; Reception booking and guest-resolution tests now include overlap-override spoofing checks).
- Typecheck, lint, and production build: all pass.

These are expected results, not results already executed against your local project. If any command fails, stop at that point and send the complete output. Do not continue to later steps until the failure is reviewed.

## 6. Scope reminder

The override is limited to an actual overlapping appointment for the same Patient and only the two Reception workflows described in the phase documentation. It requires the new dedicated permission and one bounded reason code, and writes one immutable database record for every exact conflicting appointment pair. Patient portal and public guest booking cannot use the override. Guest linking still requires the existing two-identifier identity verification. No booking UI or guest appointment search/list screen is added in this update.
