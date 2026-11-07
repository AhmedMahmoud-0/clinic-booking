# Apply Update 32 — Phase 4D Diagnostic Master Data

## Preconditions

Apply this package over the current locally verified project after Update 31 and Fix 01. The package assumes the existing `CLINIC_MASTER_DATA_MANAGE` permission, `ClinicMasterDataError`/HTTP helpers, Prisma diagnostic models, and generated Prisma client from the current project.

## Files to add

- `src/server/diagnostic-master-data/validation.ts`
- `src/server/diagnostic-master-data/diagnostic-master-data.ts`
- `src/app/api/clinic/diagnostic-master-data/route.ts`
- `src/app/api/clinic/diagnostic-master-data/lab-tests/route.ts`
- `src/app/api/clinic/diagnostic-master-data/lab-tests/[labTestId]/route.ts`
- `src/app/api/clinic/diagnostic-master-data/lab-tests/[labTestId]/components/route.ts`
- `src/app/api/clinic/diagnostic-master-data/lab-test-components/[componentId]/route.ts`
- `src/app/api/clinic/diagnostic-master-data/radiology-procedures/route.ts`
- `src/app/api/clinic/diagnostic-master-data/radiology-procedures/[procedureId]/route.ts`
- `src/app/api/clinic/diagnostic-master-data/radiology-resources/route.ts`
- `src/app/api/clinic/diagnostic-master-data/radiology-resources/[resourceId]/route.ts`
- `tests/unit/diagnostic-master-data-validation.test.ts`
- `tests/e2e/diagnostic-master-data.spec.ts`
- `docs/diagnostics/phase-4d-diagnostic-master-data.md`

## Files to replace

- `README.md`
- `docs/implementation-roadmap.md`

No other existing source files need replacement.

## Apply

1. Extract the ZIP into the current project root.
2. Preserve all existing `.env`, `.git`, `node_modules`, `.next`, generated Prisma client, migration folders, schema, and seed files.
3. Do not run `npm install`; no dependency or package-script change is included.
4. Do not run Prisma generate, migration, `db push`, reset, or seed; this update reuses existing Phase 2C models and does not change the schema.

## Expected behavior

- Only Clinic Manager and System Admin can use the protected staff diagnostic master-data endpoints.
- The catalog endpoint returns catalog data only and never returns diagnostic orders, samples, results, reports, or patient data.
- Lab tests and radiology procedures support create/update and soft-deactivation. Lab test components and radiology resources have their own controlled operations.
- Radiology modalities are limited to digital X-ray and ultrasound.
- Historical order prices remain unchanged because order items retain their price snapshots.
- A resource with scheduled or in-progress exams cannot be deactivated.
- Each create/update and its AuditLog entry are atomic.

## Validation commands

Run these in this exact order:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected test totals after Update 32: 157 unit tests and 26 E2E tests. The project must be tested locally before Phase 4D is marked complete.
