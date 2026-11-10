# Apply Update 37 — Phase 5E-1: Family Relationships & Guardian Verification

## Preconditions

Apply this update over the locally verified project after Update 36, Fix 01, and Fix 02. The developer confirmed six migrations are already applied and up to date. This update introduces the seventh migration.

This is a data/API foundation only. It does not add screens or automatically link patient accounts. Keep `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, every existing migration folder, and seed data unchanged.

## Files to add

### Database
- `prisma/migrations/20261108040000_patient_family_relationships_guardian_workflows/migration.sql`

### Server implementation
- `src/server/patient-management/patient-relationship-validation.ts`
- `src/server/patient-management/patient-relationship-policy.ts`
- `src/server/patient-management/patient-relationship-errors.ts`
- `src/server/patient-management/patient-relationship-http.ts`
- `src/server/patient-management/patient-relationships.ts`
- `src/app/api/clinic/patients/[patientId]/relationships/route.ts`
- `src/app/api/clinic/patients/[patientId]/relationships/[relationshipId]/guardian-verification/route.ts`

### Tests and documentation
- `tests/unit/patient-relationship-validation.test.ts`
- `tests/unit/patient-relationship-policy.test.ts`
- `tests/unit/patient-relationship-permission.test.ts`
- `tests/unit/patient-relationship-migration.test.ts`
- `tests/e2e/patient-family-relationships.spec.ts`
- `docs/patients/phase-5e-family-relationships-guardian-verification.md`
- `APPLY_UPDATE_37.md`
- `UPDATE_37_FILE_GUIDE.md`
- `UPDATE_37_SUMMARY.txt`

## Files to replace

- `prisma/schema.prisma`
- `src/server/auth/authorization/types.ts`
- `src/server/auth/authorization/policy.ts`
- `docs/implementation-roadmap.md`
- `README.md`

No other existing source files should be replaced. The package intentionally does not include generated Prisma output.

## What this update adds

- Directed family relationships between two existing active patient records, without automatically creating an inverse row and without granting account, portal, appointment, or medical-record access. A reverse direction is a separate deliberate entry from the other subject patient's file.
- Reception-only relationship read/manage permissions. System Admin's delegation-management permission remains separate and does not grant family-record access.
- Explicit legal-guardian verification for a minor patient only. The verifier must select an existing `PATIENT_DOCUMENT` attachment already linked to the subject patient's own record. The related patient must also be active.
- Evidence type plus a restrictive attachment reference. PostgreSQL validates same-patient ownership and document purpose and prevents a referenced attachment from being reassigned/reclassified.
- Revocation clears the current guardian state and atomically revokes pending/active grants for that exact directed relationship. Re-verification does not automatically reactivate grants.
- Legacy verified guardian rows are preserved and marked `guardianVerificationLegacy = true`. The database check allows absent evidence only for these grandfathered rows, and a trigger prevents ordinary inserts/updates from enabling the legacy exemption. New verification rows require evidence metadata. Revocation clears the legacy marker.
- Audit entries include only the event, evidence type/reference, and revoked-grant count—not document contents, national ID values, or submitted identifiers.

## Apply and database migration — do not skip

1. Extract the ZIP into the current project root and merge the listed files. Do not remove or overwrite existing migration folders.
2. Confirm `.env` points to the intended local PostgreSQL database. Do not share the connection string.
3. Validate schema and regenerate Prisma Client:

   ```powershell
   npm run db:validate
   npm run db:generate
   ```

4. Review `prisma/migrations/20261108040000_patient_family_relationships_guardian_workflows/migration.sql`. It adds an enum, three columns (including an explicit legacy marker), a restrictive foreign key, indexes, and triggers. It updates only the legacy marker on already-verified guardian rows; it does not delete relationships or fabricate evidence.
5. Check migration status:

   ```powershell
   npm run db:migrate:status
   ```

   Expected before deployment: six migrations applied and this seventh migration pending.

6. Apply the migration:

   ```powershell
   npx prisma migrate deploy --config=./prisma7.config.ts
   ```

7. Confirm the result:

   ```powershell
   npm run db:migrate:status
   ```

   Expected: `Database schema is up to date!` with seven migrations applied.

Do not use `db push`, `migrate reset`, migration preview as a substitute for deploy, seed, or manual deletion/editing of migration history. If deployment fails, stop and send the full error output; do not attempt a destructive repair.

## Application verification

After the migration succeeds, run these five commands in this exact order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The current confirmed baseline is 287 unit tests and 36 E2E tests. Update 37 adds 19 unit tests and 4 E2E authorization-boundary tests. Expected totals: **306 unit tests and 40 E2E tests**, assuming the existing test suite is unchanged. The E2E additions verify authentication/authorization and no-store response behavior; the service-level age, validation, permission, and migration contracts have dedicated unit tests. They do not claim a live end-to-end database workflow test.

## Dependencies, environment, and seed

- No dependency installation or package-script change.
- No new environment variable.
- No seed run.
- Prisma Client regeneration is required after schema update.
- The seventh PostgreSQL migration is required.

## Scope boundary

This is Phase 5E-1 only. Relationship correction/deactivation and user-facing family management remain outstanding within Phase 5E. Do not start Phase 6 until those remaining Phase 5E increments are completed and verified.
