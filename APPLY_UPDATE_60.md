# Apply MERUNO Update 60 — Phase 7G Doctor Radiology Orders

## What this update adds

1. Adds Doctor-only search for active X-ray/ultrasound procedure catalogue entries.
2. Adds read access to radiology orders attached to the authenticated Doctor's own active Encounter.
3. Adds atomic creation of immediate `ORDERED` radiology requests with catalog-controlled price/currency snapshots.
4. Adds Migration 12 to record the ordering Doctor's order-time X-ray screening decision (`SCREENING_REQUIRED` / `NOT_INDICATED`), rationale when not indicated, actor, and timestamp.
5. Adds PostgreSQL CHECK/FK constraints and a trigger that requires the assessment on new X-ray items and disallows the X-ray-specific fields on ultrasound items.

This is API/data-layer work only. It does not create a RadiologyExam, schedule an exam, reserve equipment, or add Doctor UI.

## Backup and migration pre-check

1. Back up the project folder and the local PostgreSQL database.
2. Confirm that Migration 11 (`20261109110000_prescription_prn_safety_fields`) is already applied and the database is up to date before applying this update.
3. Preserve all current migration folders and history. Do not replace the migrations directory and do not run `db push`, `migrate reset`, or a destructive recovery command.

## Files to add

- `src/server/appointments/doctor-radiology-order.ts`
- `src/server/appointments/doctor-radiology-order-policy.ts`
- `src/server/appointments/doctor-radiology-order-validation.ts`
- `src/app/api/doctor/radiology-catalog/route.ts`
- `src/app/api/doctor/encounters/[encounterId]/radiology-orders/route.ts`
- `tests/unit/doctor-radiology-order-policy.test.ts`
- `tests/unit/doctor-radiology-order-validation.test.ts`
- `tests/unit/doctor-radiology-pregnancy-migration.test.ts`
- `tests/e2e/doctor-radiology-orders.spec.ts`
- `docs/clinical/phase-7g-doctor-radiology-orders.md`
- `prisma/migrations/20261109223000_radiology_order_pregnancy_assessment/migration.sql`

## Files to replace

- `prisma/schema.prisma`
- `README.md`
- `docs/implementation-roadmap.md`

No other existing project file should be replaced.

## Apply

1. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
2. Add all new files at the exact paths listed above.
3. Replace only the three existing files listed above when prompted.
4. Keep `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, all existing migrations (including migration 11), and the local PostgreSQL database.

## Prisma and database steps

Run from the project root:

```powershell
npm run db:validate
npm run db:generate
npm run db:migrate:status
```

Confirm that Migration 12 is the only new pending migration. If any earlier migration is pending or the status is not what you expect, stop and inspect the history rather than deploying out of order.

Then apply the additive migration:

```powershell
npx prisma migrate deploy --config=./prisma7.config.ts
npm run db:migrate:status
```

The final status must report that the database schema is up to date. Migration 12 does not delete, rewrite, backfill, or reset existing rows. Existing radiology order items are preserved unchanged; the new trigger governs new inserts/updates going forward.

No `npm install`, seed, database reset, `db push`, or migration-preview regeneration is required.

## Verification

After Prisma validation/generation and migration deployment, run:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming no unrelated local tests were added or removed from the confirmed Update 59 baseline:

- **800 unit tests across 78 files** (23 policy + 17 validation + 9 migration-contract tests added)
- **109 Playwright E2E tests** (4 added)

If any check fails, stop and send the complete output before continuing. Do not proceed to scheduling/exam workflows while this update has unresolved failures.

## Safety boundaries

- Only an active Doctor can create orders for their own active Encounter.
- Only 1–10 distinct active `RadiologyProcedure` IDs are accepted. No manual/free-text procedure, caller-selected modality, resource, schedule, label, price, currency, author, state, or timestamp is accepted.
- X-ray requests require a documented order-time decision (`SCREENING_REQUIRED` or `NOT_INDICATED`) saved with employee and timestamp. `NOT_INDICATED` requires a clinical rationale. The system does not infer applicability from age or gender and does not invent an age cutoff.
- This order-time workflow decision is not a pregnancy test or a screening result. `SCREENING_REQUIRED` means the separate exam-day `RadiologyPregnancyScreening` must be completed before the X-ray examination.
- Ultrasound items do not carry the X-ray-specific order-time screening-decision fields.
- No RadiologyExam, scheduling, resource allocation, report, approval, or release is created by this update.
- This remains a synthetic-data portfolio/demo application, not production clinical software.
