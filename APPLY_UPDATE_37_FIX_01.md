# Apply Update 37 Fix 01 — Recover the failed Phase 5E-1 migration

## Why this fix is required

The first deployment failed at:

`DROP CONSTRAINT "PatientRelationship_guardian_verification_consistent"`

PostgreSQL reported that the constraint does not exist. Earlier statements in the migration may already have committed (the enum, columns, and legacy-row marker update) before the failing statement. A plain retry of the original migration may therefore fail on duplicate objects.

This fix makes the existing failed migration safe to resume. It does not create a new migration and does not delete patient or relationship data.

## Safety rules

- Do not run `prisma migrate reset` or `db push`.
- Do not delete rows from `_prisma_migrations`.
- Do not manually drop the enum, columns, constraints, indexes, or triggers.
- Do not run `migrate resolve --applied`.
- Back up the local `clinic-booking` database before recovery (pgAdmin Backup is suitable).

## Files to replace

1. `prisma/migrations/20261108040000_patient_family_relationships_guardian_workflows/migration.sql`
2. `tests/unit/patient-relationship-migration.test.ts`

No other existing files should be replaced.

## Recovery sequence

Run these steps from the project root, against the same local database shown in the failed output.

### 1. Confirm this is still the failed migration

```powershell
npm run db:migrate:status
```

It should report `20261108040000_patient_family_relationships_guardian_workflows` as failed. If it instead reports applied or pending, stop and send the output before continuing.

### 2. Back up the database

Use pgAdmin's Backup action for database `clinic-booking` before changing migration state. Keep the backup outside the project folder.

### 3. Replace the two files

Merge the Fix 01 ZIP into the project root and replace only the two paths listed above.

### 4. Validate Prisma schema and regenerate its client

```powershell
npm run db:validate
npm run db:generate
```

### 5. Mark only this failed attempt as rolled back

This command changes the migration history state; it does not modify application tables or remove the partial DDL. The patched SQL is deliberately idempotent so it can continue whether the earlier DDL persisted or PostgreSQL rolled it back.

```powershell
npx prisma migrate resolve --rolled-back "20261108040000_patient_family_relationships_guardian_workflows" --config=./prisma7.config.ts
```

Do not use `--applied`.

### 6. Deploy the corrected seventh migration

```powershell
npx prisma migrate deploy --config=./prisma7.config.ts
```

### 7. Confirm migration status

```powershell
npm run db:migrate:status
```

Expected: seven migrations found, no failed/pending migrations, and `Database schema is up to date!`.

If any command fails, stop and send the full output. Do not attempt another resolve command or manual SQL cleanup.

## Why the patched SQL is safe to resume

- Enum creation catches only `duplicate_object`.
- Columns use `ADD COLUMN IF NOT EXISTS`.
- The absent check constraint uses `DROP CONSTRAINT IF EXISTS` before adding the required check.
- Functions use `CREATE OR REPLACE`.
- Triggers are dropped and recreated by their exact names.
- Foreign-key creation checks `pg_constraint` for the expected name on the intended table.
- Indexes use `IF NOT EXISTS`.
- The legacy-marker update remains scoped to rows already marked as legal guardians with no evidence pointer/type.

No patient rows, appointments, attachments, or relationships are deleted. The migration continues to preserve legacy guardian rows and requires evidence for new verification.

## Application checks after database recovery

Run these five commands in the established order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The original Update 37 expected totals remain 306 Unit Tests and 40 E2E Tests, assuming the existing project test suite is unchanged.

## Database / dependency impact

- Same seventh migration; no eighth migration.
- No new dependency or environment variable.
- Prisma Client regeneration is required because Update 37 changes the schema.
