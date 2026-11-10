# Apply Update 38 — Phase 5E-2: Family Relationship Lifecycle

## Preconditions

Apply this update over the locally verified project after Update 37 + Fix 01. The developer confirmed migration 7 is applied, `Database schema is up to date!`, 307 unit tests and 40 E2E tests passed, and the typecheck, lint, and production build passed.

This update adds the eighth migration. It is a backend/data-layer increment only. It does not add UI pages, dependencies, package scripts, seed data, or environment variables.

## Important safety notes

- Keep your current `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, existing package files, all prior migration folders, and seed data.
- Do not replace or edit migration 7 (`20261108040000_patient_family_relationships_guardian_workflows`).
- Do not delete any patient, family relationship, patient-access grant, attachment, or audit row.
- Do not run `db push`, `migrate reset`, `migrate resolve`, or manual SQL to change Prisma migration history.
- Deactivation is terminal in this increment. A deactivated relationship remains as an inactive historical row and cannot be reactivated or mutated.

## Files to add

### Database
- `prisma/migrations/20261108050000_patient_relationship_lifecycle/migration.sql`

### API routes
- `src/app/api/clinic/patients/[patientId]/relationships/[relationshipId]/route.ts`
- `src/app/api/clinic/patients/[patientId]/relationships/[relationshipId]/deactivate/route.ts`

### Tests and documentation
- `tests/unit/patient-relationship-lifecycle-migration.test.ts`
- `docs/patients/phase-5e-family-relationship-lifecycle.md`
- `APPLY_UPDATE_38.md`
- `UPDATE_38_FILE_GUIDE.md`
- `UPDATE_38_SUMMARY.txt`

## Files to replace

- `prisma/schema.prisma`
- `src/server/patient-management/patient-relationship-validation.ts`
- `src/server/patient-management/patient-relationships.ts`
- `src/server/patient-management/patient-consents.ts`
- `src/server/auth/authorization/delegation-policy.ts`
- `src/server/auth/authorization/patient-access.ts`
- `src/server/auth/delegation/patient-delegation.ts`
- `tests/unit/patient-relationship-validation.test.ts`
- `tests/unit/authorization-policy.test.ts`
- `tests/e2e/patient-family-relationships.spec.ts`
- `docs/patients/phase-5e-family-relationships-guardian-verification.md` (retain existing content; Update 38 adds a reference to the lifecycle increment)
- `docs/implementation-roadmap.md`
- `README.md`

No other existing files should be replaced. The package excludes generated Prisma output.

## Apply procedure

1. Extract the ZIP into the existing project root and merge the folders. Add the new files and replace only the exact paths listed above.
2. Confirm `.env` still points to the intended local PostgreSQL database. Do not paste or share the connection string.
3. Validate the schema and regenerate Prisma Client:

   ```powershell
   npm run db:validate
   npm run db:generate
   ```

4. Check migration state:

   ```powershell
   npm run db:migrate:status
   ```

   Expected before deployment: eight migrations found, with only `20261108050000_patient_relationship_lifecycle` pending. The previous seven migrations must remain applied.

5. Review `prisma/migrations/20261108050000_patient_relationship_lifecycle/migration.sql`. It adds four columns, an employee FK, two check constraints, two indexes, and an immutability/delete-prevention trigger. Existing relationship rows default to active. The migration does not delete or rewrite patient or grant rows.

6. Apply the migration:

   ```powershell
   npx prisma migrate deploy --config=./prisma7.config.ts
   ```

7. Confirm the result:

   ```powershell
   npm run db:migrate:status
   ```

   Expected: `Database schema is up to date!` with eight migrations applied.

If migration deployment fails, stop and send the complete output. Do not try `migrate resolve`, manual cleanup, or destructive commands. The migration uses additive and guarded DDL, but recovery must still be based on the actual PostgreSQL error.

## Application verification

Only after migration 8 succeeds, run these five commands in this exact order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the existing test suite remains unchanged: **315 unit tests** and **42 E2E tests**. The two new E2E tests verify authentication/authorization boundaries for correction and deactivation. Unit tests cover controlled reason-code validation, inactive-relationship access denial, and migration integrity. These tests do not claim a live database-backed browser workflow test.

## Change summary

- Reception can correct a directed relationship type with an enum reason code. Free-text notes and personal details are not accepted.
- If the relationship is currently verified as a legal guardian, correction clears the current guardian evidence reference and revokes pending/active grants in the same Serializable transaction. The document itself remains in the patient's archive.
- Reception can soft-deactivate a relationship. The row remains visible in the relationship history with deactivation timestamp and employee actor; guardian state is cleared and pending/active grants are revoked atomically.
- Deactivated relationships cannot be reactivated or mutated in this increment. The existing unique patient-pair key remains; re-adding the same directed pair is not supported here.
- Delegated access and grant creation/renewal now require an active relationship. Consent signer lookup also requires an active guardian relationship.
- The relationship list includes inactive rows and deactivation metadata. The internal legacy-verification marker is not exposed.

## Dependencies, environment, seed

- No dependency installation.
- No new environment variable.
- No seed run.
- Prisma Client regeneration is required after the schema change.
- The eighth PostgreSQL migration is required.
