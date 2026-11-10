# Apply MERUNO Update 58 — Phase 7E Doctor Prescription Drafts

## What this update adds

1. Adds Doctor-only prescription history read, draft creation, and original-author draft update APIs for an active Encounter.
2. Reuses the existing `Prescription` and `PrescriptionItem` models.
3. Adds structured PRN maximum-dose fields to `PrescriptionItem` and PostgreSQL migration 11.
4. Enforces Encounter ownership/source/state, active Doctor role/profile, a single editable draft per Encounter, original-prescriber ownership, and immutable issued/cancelled prescriptions through these routes.
5. Adds policy, request-validation, migration-contract, and E2E authorization-boundary tests.

## Important: database migration required

This update includes migration 11:

`20261109110000_prescription_prn_safety_fields`

It modifies the existing `PrescriptionItem` table by adding:

- `isPrn` (defaults existing and new rows to `false`)
- `prnMaxQuantityPerDose`
- `prnMaxDoseUnit`
- `prnMaxDosesPerDay`

A PostgreSQL CHECK constraint requires complete PRN maximum-dose information whenever `isPrn = true`. Migration 11 also adds a partial unique index allowing one `DRAFT` prescription per Encounter. It checks for legacy duplicate drafts first and fails without modifying them if any are found. Existing rows are retained.

**Back up your local PostgreSQL database before applying this update.** Do not reset, drop, or use `db push` to reconcile the schema.

## Files to add

- `src/app/api/doctor/encounters/[encounterId]/prescriptions/route.ts`
- `src/app/api/doctor/encounters/[encounterId]/prescriptions/[prescriptionId]/route.ts`
- `src/server/appointments/doctor-prescription.ts`
- `src/server/appointments/doctor-prescription-policy.ts`
- `src/server/appointments/doctor-prescription-validation.ts`
- `tests/unit/doctor-prescription-policy.test.ts`
- `tests/unit/doctor-prescription-validation.test.ts`
- `tests/unit/prescription-prn-migration.test.ts`
- `tests/e2e/doctor-prescriptions.spec.ts`
- `docs/clinical/phase-7e-doctor-prescriptions.md`
- `prisma/migrations/20261109110000_prescription_prn_safety_fields/migration.sql`

## Files to replace

- `prisma/schema.prisma`
- `docs/implementation-roadmap.md`
- `README.md`

Replace only these three existing files. Add all files listed above at their exact paths. Do not replace the whole `prisma/migrations` folder; add only the new migration directory and preserve migrations 1–10 exactly as they are.

## Apply in this order

1. Stop any running Next.js server and make a backup/commit of the current project. Back up the local PostgreSQL database separately.
2. Before extracting the update, run:

   ```powershell
   npm run db:migrate:status
   ```

   Confirm all existing migrations through migration 10 are applied and the database is up to date. If migration 10 is not applied or another migration is pending, stop and report the complete status output before proceeding.
3. Extract the ZIP into the existing `clinic-booking` project root and merge folders. Replace only the three files in the `Files to replace` list.
4. Validate the updated Prisma schema and regenerate the client:

   ```powershell
   npm run db:validate
   npm run db:generate
   ```
5. Check migration status. Migration 11 should now be the only pending migration:

   ```powershell
   npm run db:migrate:status
   ```

   If anything other than migration 11 is pending, stop and report the output. Do not reset or regenerate migration history.
6. Apply migration 11:

   ```powershell
   npx prisma migrate deploy --config=./prisma7.config.ts
   ```
7. Confirm the database is up to date:

   ```powershell
   npm run db:migrate:status
   ```

8. Run the application checks:

   ```powershell
   npm run typecheck
   npm run lint
   npm test
   npm run test:e2e
   npm run build
   ```

If Prisma validation, generation, migration deploy, or status fails, stop. Do not use `prisma db push`, `migrate reset`, schema deletion, or manual history edits as a workaround. Send the complete error/status output so the migration can be diagnosed safely.

## Expected test totals

Baseline confirmed after Update 57 Fix 01: 669 unit tests and 96 E2E tests.

Update 58 adds 48 unit tests (19 policy + 21 validation + 8 migration-contract) and 5 E2E authorization tests. Expected totals, assuming no unrelated local test changes:

- **717 unit tests**
- **101 E2E tests**

Playwright's self-signed certificate warning is expected in the current local test configuration; the test result itself must still show all tests passed.

## Dependencies and generated files

- No `npm install` is required; package manifests, scripts, and dependencies do not change.
- Run `npm run db:generate` after schema validation to regenerate the ignored local Prisma Client.
- Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, or your local database.
- Preserve migrations 1–10; only migration 11 is added.

## Scope limitations

This update creates and edits unsigned DRAFT prescriptions only. It does not issue/sign/cancel prescriptions, preserve draft-version snapshots, implement a medication catalogue, check allergy or drug interactions, calculate doses, or provide clinical recommendations. Medication and direction fields are manual text and this remains a synthetic-data demo, not production clinical software.
