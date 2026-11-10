# Apply MERUNO Update 59 — Phase 7F Doctor Laboratory Test Orders

## What this update adds

1. Adds a Doctor-only search endpoint for the active laboratory test catalog.
2. Adds Doctor-only read access to lab orders on the authenticated Doctor's own active Encounter.
3. Adds atomic creation of an immediate `ORDERED` lab request containing 1–20 distinct active catalog tests.
4. Uses catalog-controlled price/currency snapshots, server-generated order references, and a PII-minimal audit event.
5. Reuses the existing Phase 2C schema and existing `clinical.order.create` permission.

This is an API/data-layer increment only. It does not add UI or laboratory processing workflows.

## Files to add

- `src/server/appointments/doctor-lab-order.ts`
- `src/server/appointments/doctor-lab-order-policy.ts`
- `src/server/appointments/doctor-lab-order-validation.ts`
- `src/app/api/doctor/lab-catalog/route.ts`
- `src/app/api/doctor/encounters/[encounterId]/lab-orders/route.ts`
- `tests/unit/doctor-lab-order-policy.test.ts`
- `tests/unit/doctor-lab-order-validation.test.ts`
- `tests/e2e/doctor-lab-orders.spec.ts`
- `docs/clinical/phase-7f-doctor-lab-orders.md`

## Files to replace

- `README.md`
- `docs/implementation-roadmap.md`

No other existing project file should be replaced.

## Apply

1. Make a backup or commit the current project before applying the patch.
2. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
3. Add all files listed above at their exact paths.
4. Replace only `README.md` and `docs/implementation-roadmap.md` when prompted.
5. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, and the local PostgreSQL database.

## Database and dependencies

- Update 58 migration 11 (`20261109110000_prescription_prn_safety_fields`) must remain applied. The developer confirmed it was applied and the database reported up to date.
- Update 59 adds no schema change, migration, seed, or database write.
- No `npm install`, Prisma validation, Prisma generation, `db push`, or migration deployment is required for this update.

## Verification

Run from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming no unrelated local test changes from the confirmed Update 58 baseline:

- **751 unit tests across 75 files** (34 added: 17 policy + 17 validation)
- **105 Playwright E2E tests** (4 added)

The self-signed certificate warning from the local Playwright HTTPS server may still appear; the test result must show all tests passing.

If any check fails, stop and send the complete output before continuing to the radiology update. Do not add a migration or change the permission matrix as a workaround.

## Scope and safety boundaries

- Catalog labels are reference data only; this update does not recommend tests or provide medical advice.
- Only an active Doctor can create orders for their own active Encounter.
- Appointment and walk-in Encounter source invariants are rechecked server-side.
- Only active catalog test IDs are accepted. Names, prices, item states, patient/Doctor IDs, authorship, order reference, and timestamps are server-controlled.
- Orders are created immediately with `ORDERED` status; items start `PENDING`. No draft/edit/cancel/release path is included.
- Multiple separate LabOrders are allowed for one Encounter. The API does not persist an idempotency token; clients should prevent accidental double-submit.
- This remains a synthetic-data portfolio/demo project, not production clinical software.
