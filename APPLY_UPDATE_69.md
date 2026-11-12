# Apply Update 69 — Phase 8F–8H

Update 69 adds external laboratory intake/referrals and radiology scheduling/preparation. It includes Migration 15:

`20261111010000_external_lab_intake_and_radiology_preparation`

## 1. Protect the current project

- Commit or copy the current project before applying this update.
- Take a PostgreSQL backup before applying Migration 15.
- Keep the current `.env`, `.git`, `node_modules`, `.next`, `generated/`, `package.json`, `package-lock.json`, and `prisma7.config.ts`.
- Do not run `db push`, `migrate dev`, `migrate reset`, or any database reset/reseed command.

## 2. Copy the update

Extract the ZIP into the project root and merge folders. Replace the files at the same paths. The archive intentionally includes updated existing Lab files and API routes because the existing Lab worklists, sample identity checks, draft-result handling, and critical read-back must also support external-intake orders.

The Prisma schema file is replaced with the Update 69 schema. Preserve all existing migration folders and add only the new migration folder from this update.

## 3. Validate schema and generate Prisma Client

Run from the project root:

```bash
npm run db:validate
npm run db:generate
```

If either command fails, stop and send the complete error. Do not apply the migration until validation and generation succeed.

## 4. Inspect and apply Migration 15

Check the current state first:

```bash
npx prisma migrate status --config=./prisma7.config.ts
```

The expected state is the existing 14 migrations applied and exactly one pending migration:

`20261111010000_external_lab_intake_and_radiology_preparation`

Then apply only pending reviewed migrations:

```bash
npx prisma migrate deploy --config=./prisma7.config.ts
```

Verify afterward:

```bash
npx prisma migrate status --config=./prisma7.config.ts
```

Expected: 15 migrations found and database schema up to date.

### Migration safety notes

- The migration is incremental. It does not drop tables, truncate data, delete rows, reset the schema, or rewrite prior migration history.
- Existing Patient rows receive `recordType = FULL` as a safe default.
- Existing LabOrder rows remain internal-origin orders. A check constraint now requires each order to have exactly one origin: either an Encounter/ordering employee or an ExternalLabIntake.
- The migration refuses to add the resource-overlap exclusion constraint if existing active RadiologyExam bookings overlap on the same resource. If this occurs, stop and send the full database error; do not manually delete or alter records.
- The migration enables PostgreSQL `btree_gist` if it is not already enabled. If the database role lacks permission or the extension is unavailable, stop and send the full error; do not edit the migration or install a substitute manually.

## 5. Run the project checks

Run in this order:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals after Update 69:

- Unit tests: **1,139 passed across 100 files** (61 new tests in 5 new files over the Update 68 verified baseline).
- Playwright E2E: **176 passed** (19 new cases in the external-lab/radiology suite over the Update 68 verified baseline).

These are expected counts, not claimed results. The complete project typecheck, Vitest, Playwright, and production build must be run locally after applying the update.

If any command fails, stop at the first failure and send the complete output. Do not proceed to the next Phase 8 update until the failure is resolved and all checks pass.

## Scope boundary

Update 69 completes only the API/data layer for 8F–8H. It does not implement radiology exam execution, report drafting/approval/release, external radiology, secure report delivery, full staff UI, or any real-world clinical validation. Those remain in Update 70 or later. Use synthetic data only; MERUNO remains a portfolio/demo application, not production clinical software.
