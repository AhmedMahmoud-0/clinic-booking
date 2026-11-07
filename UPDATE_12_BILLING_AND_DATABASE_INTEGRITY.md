# MERUNO Update 12 — Billing and Database Integrity Hardening

## Purpose

This update addresses the integrity gaps found during review of the Phase 2E migration draft. It updates the Prisma schema and the migration preview generator. It does not apply SQL to PostgreSQL and does not modify your local database.

## Files to replace

1. `prisma/schema.prisma`
2. `scripts/create-initial-migration.mjs`
3. `docs/database/phase-2e-migration-seed.md`
4. `docs/implementation-roadmap.md`
5. `README.md`

A new file is included: `UPDATE_12_BILLING_AND_DATABASE_INTEGRITY.md`.

## What changed

- Full payment only: completed payment amount and currency must exactly match the invoice; the existing unique index still permits at most one completed payment. Deferred checks prevent later invoice edits/payment voids from breaking paid/refunded state consistency.
- Invoice reconciliation at transaction commit: `subtotal` equals gross line amounts (`unitPrice * quantity`), `discountTotal` equals the sum of line discounts, and `total` equals net `lineTotal` values; currency and invoice/encounter patient consistency are checked.
- Refund integrity: refund header amount equals its refund-item sum; refund items must belong to the same invoice; active refunds cannot exceed an invoice-item balance or the invoice total; active refund requests require a completed payment. Invoice-row locks serialize concurrent refund operations for the same invoice.
- Discount approvals: preserve a history of requests, allow a new request after a prior request is decided/cancelled, permit only one pending request per invoice, and prevent applied discounts from exceeding approved amounts.
- Audit history: restrict employee deletion when audit rows refer to that employee.
- Doctor schedules: prohibit overlapping active weekly schedule rows for the same doctor, weekday, effective date range, and minute range.
- Radiology: scheduled/in-progress exams require a resource and a complete time slot; completed exams require a performer and performance timestamp; assigned resource modality must match the requested procedure.

## Apply the files

Replace only the five existing files listed above. Keep `.git`, `.env`, `node_modules`, `.next`, `generated/prisma`, and your local database untouched.

Then run this batch from PowerShell in the project root:

```powershell
npm run db:validate
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run db:migration:preview
```

The migration preview command will refresh the known initial SQL draft locally. Before replacing the prior draft, it copies the old SQL to `prisma/migration-preview-backups/`. It refuses to overwrite an unexpected folder or any other migration history. It does not apply the migration.

## Do not run yet

Do not run `npm run db:seed`, `prisma migrate dev`, `prisma migrate deploy`, `prisma db push`, or `prisma migrate reset` yet. First review the newly generated complete SQL draft. The PostgreSQL extension `btree_gist` must be available to the local database user.

## Important application responsibilities

Database constraints do not replace authorization. The future billing services must still enforce manager approval and separation of duties, prevent requesters from approving their own discounts/refunds, invoice only completed services, and update invoice statuses consistently after payment/refund. Handle PostgreSQL constraint errors as user-friendly conflicts.
