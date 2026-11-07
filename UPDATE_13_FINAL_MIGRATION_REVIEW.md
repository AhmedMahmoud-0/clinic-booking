# MERUNO Update 13 — Final Billing Reconciliation

## Purpose

This is the final Phase 2E migration-preview correction. It does not apply SQL, connect to PostgreSQL, or modify the developer database. It corrects invoice accounting arithmetic and adds database-level cross-row checks for applied discounts and diagnostic source orders.

## Files to replace

1. `scripts/create-initial-migration.mjs`
2. `docs/database/phase-2e-migration-seed.md`
3. `docs/implementation-roadmap.md`
4. `README.md`
5. `UPDATE_12_BILLING_AND_DATABASE_INTEGRITY.md`

New document: `UPDATE_13_FINAL_MIGRATION_REVIEW.md`.

No Prisma model or package dependency changes are required in this final correction. Keep `.git`, `.env`, `node_modules`, `.next`, `generated/prisma`, and the local database unchanged.

## Final accounting convention

- `Invoice.subtotal` = sum of each line's gross amount (`unitPrice * quantity`).
- `Invoice.discountTotal` = sum of `InvoiceItem.discountAmount`.
- `InvoiceItem.lineTotal` = gross line amount minus that line's discount.
- `Invoice.total` = sum of all net `lineTotal` values, and must also equal `subtotal - discountTotal`.

The database rejects mismatches and currency inconsistencies at transaction end.

## Additional controls

- Applied discounts cannot exceed approved discount requests.
- Active requested/approved discount amounts cannot exceed invoice subtotal; rejected/cancelled historical requests are excluded from that requested-amount ceiling.
- Laboratory and radiology invoice items must be sourced from an order belonging to the same encounter as the invoice. The check also runs if an order or order item is later reassigned.
- Invoice item mutations lock their invoice row before commit-time reconciliation.

## Apply files and preview SQL

Replace only the four files listed above. Then, from the project root, run:

```powershell
node --check scripts/create-initial-migration.mjs
npm run db:validate
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run db:migration:preview
```

The preview command writes `prisma/migrations/20261105230000_initial_schema/migration.sql` and preserves a prior draft under `prisma/migration-preview-backups/`. It does not apply SQL or seed records.

## Applying the migration

Only after the preview has been regenerated successfully and its complete SQL reviewed, confirm that `DATABASE_URL` points to the intended local development database. Then apply the already-generated initial migration using:

```powershell
npx prisma migrate dev --config=./prisma7.config.ts
```

Do not add `--name` when the generated initial migration folder already exists. Do not use `db push`, `migrate reset`, or run the seed before the migration succeeds. If PostgreSQL reports an error, stop and retain the full error output; do not try destructive workarounds.

## Verification boundary

This package was checked with `node --check`, 22 static migration/schema consistency assertions, trigger/function symbol checks, and an arithmetic test case. Those checks passed. They do not replace generating the final SQL with the installed Prisma CLI or running that SQL on PostgreSQL. Confirm that PostgreSQL has `btree_gist` available and that the actual migration completes against the intended local database before running `npm run db:seed`.
