# Phase 2E — Schema Hardening, Initial Migration Draft, and Seed

## Current scope

This update closes the schema-only design work from Phases 2A–2D. The current reviewed schema contains **57 Prisma models and 55 enums**. The project is still a single-branch outpatient clinic. No authentication tables are introduced here; Better Auth and user-role mappings remain in Phase 3.

## Database-level integrity rules

The initial migration preview script appends PostgreSQL rules that Prisma Schema Language cannot fully express:

- Check constraints for schedule/time ranges, positive durations, non-negative prices, vital values, typed laboratory results, billing arithmetic, and state/timestamp consistency.
- Partial unique indexes for one primary specialty per doctor, one primary contact per patient/contact type, one primary encounter diagnosis, and one completed payment per invoice. A voided payment attempt can remain in history, but an invoice cannot have multiple completed payments.
- GiST exclusion constraints to prevent overlapping active appointments for the same doctor or patient, overlapping active weekly schedule rows for a doctor, and overlapping scheduled exams for the same radiology resource. These use the PostgreSQL `btree_gist` extension.
- Exactly-one-owner / exactly-one-recipient checks for attachments and notifications.
- Full-payment enforcement: one completed payment per invoice, with the payment amount and currency matching the invoice total and currency. Partial and overpayments are rejected. Deferred state reconciliation also prevents later invoice edits or payment voids from leaving a paid/refunded invoice inconsistent.
- Deferred invoice reconciliation uses one consistent accounting convention: `subtotal` is the sum of gross line amounts (`unitPrice * quantity`), `discountTotal` is the sum of line discounts, and `total` is the sum of net `lineTotal` values. The database also verifies `total = subtotal - discountTotal` and currency consistency.
- Discount request history: multiple requests can be retained per invoice, with at most one `PENDING` request at a time. Applied discounts cannot exceed the sum of approved discount requests, and approved/requested discounts cannot exceed the invoice subtotal.
- Diagnostic invoice source matching: laboratory and radiology invoice items must originate from the same encounter as the invoice. The check is repeated if the source order or order item is later changed.
- Deferred refund integrity: each refund amount must equal its item amounts; each refund item must belong to the same invoice; active refund requests/approvals/completions cannot exceed the affected line total or invoice total; refunds require a completed full payment. Invoice rows are locked while refund requests/items are changed to serialize competing refund operations.
- Radiology workflow checks: scheduled/in-progress exams require a resource and a complete time slot; completed exams require performer and performance time; the resource modality must match the procedure modality.
- Audit retention: `AuditLog.actorEmployeeId` uses `ON DELETE RESTRICT`, so deleting an employee cannot silently nullify the actor of an existing audit entry.

Cross-row rules are implemented with deferred PostgreSQL constraint triggers where necessary. Application workflows must still use database transactions, handle constraint errors cleanly, and apply manager approval/separation-of-duties rules; database integrity alone does not grant authorization.

## Create the migration preview (does not modify PostgreSQL)

Run from the project root:

```powershell
npm run db:migration:preview
```

The script uses the installed Prisma CLI to generate a full initial SQL diff from an empty schema to `prisma/schema.prisma`, appends the custom integrity SQL, and writes:

- `prisma/migrations/20261105230000_initial_schema/migration.sql`
- `prisma/migrations/migration_lock.toml` (if it does not already exist)

When the known initial draft folder already exists and contains only `migration.sql`, it preserves the prior draft under `prisma/migration-preview-backups/` and refreshes the SQL file. It refuses to overwrite an unexpected folder or generate a baseline over any other migration history. It does **not** apply SQL, drop tables, reset the database, or write data.

Prisma's `migrate diff --from-empty --to-schema ... --script` is used to render SQL. Prisma 7's `migrate dev --create-only` is an alternative when intentionally creating a draft against a development database, but this package uses the schema diff so that preview generation does not apply migrations. See the official Prisma v7 CLI reference and migration workflow.

## Synthetic seed data

`prisma/seed.sql` is idempotent and uses stable IDs plus `ON CONFLICT` upserts. It creates:

- 7 medical specialties.
- 8 synthetic doctor employees/profiles with the agreed specialty distribution (2 Internal Medicine; 1 in each of the other 6 specialties).
- Consultation and follow-up services and synthetic per-doctor prices.
- 8 laboratory test catalog entries and selected components.
- 6 diagnosis catalogue labels marked `MERUNO-DEMO` (not a clinical coding authority).
- 4 radiology procedures (Digital X-ray / Ultrasound only) and 2 radiology resources.

No patient records, patient contact details, medical encounters, diagnoses attached to patients, prescriptions, or real employee login accounts are inserted. All seeded doctors and catalog values are synthetic portfolio data.

After the initial migration has been reviewed and applied to the local development database, run:

```powershell
npm run db:seed
```

Do not run the seed before the tables exist. The seed script writes catalog/demo rows, so it is intentionally a separate command.

## Validation batch

After applying this update, run the existing project checks in one batch:

```powershell
npm run db:validate
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

These checks validate the Prisma schema, regenerate the client, and test the current application baseline. They do not apply the migration or execute the seed.

## Before applying the migration

1. Confirm `DATABASE_URL` points to the local MERUNO development database, not any shared or production database. Do not paste the URL into chat.
2. Keep a backup if the database contains anything that must be retained.
3. Review the generated `migration.sql`, especially the `btree_gist` extension, exclusion constraints, deferred trigger functions, and full-payment/refund rules. The local PostgreSQL installation must have the `btree_gist` extension available to the database user.
4. Check migration status. Do not run `migrate reset`, `db push`, or any destructive command.
5. Only after review, apply the initial migration with the Prisma development workflow.

## Remaining application-level invariants

The migration enforces the core monetary and cross-row integrity rules listed above. The application must still enforce workflow authorization and sequencing: only a manager may approve discounts/refunds; the requester must not approve their own request; invoicing is permitted only after the relevant service is completed; issued invoices must not be silently edited; invoice status must be updated consistently after payment/refund; and the application must return user-friendly errors for PostgreSQL constraint violations. Add dedicated transactional and concurrency tests when billing and booking services are implemented.
