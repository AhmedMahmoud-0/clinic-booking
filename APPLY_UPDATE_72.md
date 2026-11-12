# Apply MERUNO Update 72 — Phase 9B

Update 72 adds discount approvals, item-level refunds, approved-refund execution, external diagnostic-intake invoices, Walk-in consultation price snapshots, and financial reports. It builds on the locally verified Update 71 / Phase 9A.

## 1. Back up

Back up the project folder and PostgreSQL database. Keep the existing migration history intact. Use synthetic records only.

## 2. Merge the files

Extract the ZIP at the existing `clinic-booking` project root and merge folders. Follow `UPDATE_72_FILE_GUIDE.md` exactly.

- Replace the listed billing service, route, and component files.
- Merge `prisma/schema.prisma` with the current Update 71 schema. The delivered schema includes the Update 72 additions; retain any unrelated local changes made after Update 71.
- Add the new migration directory exactly as delivered.
- Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, or the PostgreSQL database.
- Do not use `db push`, `migrate dev`, `migrate reset`, or a migration preview to apply this update.

## 3. Validate and apply the migration safely

Run:

```bash
npm run db:validate
npm run db:generate
npm run db:migrate:status
```

The new migration is:

`20261112010000_billing_phase_9b_discounts_refunds_and_external_invoices`

Only when the status confirms this is the expected pending migration (and there are no unrelated pending migrations), apply it with:

```bash
npx prisma migrate deploy --config=./prisma7.config.ts
```

Then run `npm run db:migrate:status` again and confirm the migration is applied. If the status shows any other pending migration, stop and inspect the migration history before deploying anything.

## 4. Run project checks

```bash
npm run typecheck
npm run lint
npm test
npx playwright test --workers=1
npm run build
```

Stop at the first failure and send the complete output. Do not proceed to another phase until these checks pass.

## 5. Workspace wiring and translations

The update provides two composition components:

- `CashierBillingWorkspace` combines invoice/payment/receipt, discount/refund request, approved-refund execution, and financial reports.
- `ClinicManagerBillingWorkspace` combines discount/refund approval and financial reports.

Mount each component in the existing Cashier or Clinic Manager workspace page, replacing the prior billing workbench where applicable. The components require `copy` objects typed by their exported prop types and the active locale string (`ar-EG` / `en-US`, or the project's equivalent). Map each label to the project's existing Arabic/English translation values. No new translation files, translation keys, or second translation mechanism are included; this avoids creating keys that may not match the current project dictionaries.

Example imports:

```ts
import { CashierBillingWorkspace } from "@/components/billing/cashier-billing-workspace";
import { ClinicManagerBillingWorkspace } from "@/components/billing/clinic-manager-billing-workspace";
```

The exact page paths and translation object names are intentionally not guessed because they are project-specific. TypeScript will enforce the required `invoiceCopy`, `adjustmentsCopy`, `refundExecutionCopy`, `reportsCopy`, `approvalsCopy`, and `locale` values.

## 6. Phase 9B behavior and limits

- Discounts can be requested by Cashier on DRAFT invoices only. A Clinic Manager must approve or reject the request; rejection requires a reason. A requester cannot decide their own request.
- Refund requests are tied to selected invoice items that the server verifies are explicitly not provided. The server calculates each line's net amount after invoice-level discount allocation; the client cannot set the refund amount. A Clinic Manager must approve or reject the request; rejection requires a reason.
- A refund is completed by Cashier only after approval, using the original payment method. POS/e-wallet completion requires a transaction reference. The original invoice and payment are preserved; the invoice status is updated to reflect completed refunds.
- External diagnostic-intake invoices are linked to an existing `ExternalLabIntake` and patient. Only released in-clinic laboratory items are billable. Existing drafts remain available for refresh when additional results are released.
- Walk-in consultation invoices require an active consultation service assigned to that doctor. The service description and price are snapshotted into the draft and are not silently changed by later catalogue edits.
- Reports use `Africa/Cairo` date boundaries and are limited to 93 calendar days per query.
- No partial payments, online payment gateway, installments, insurance claims, or System Admin financial permissions are added.

## 7. API smoke-test sequence

Use authenticated synthetic Cashier and Clinic Manager sessions. Use same-origin requests and real synthetic IDs from the local database.

1. `GET /api/cashier/invoices/eligible-external-intakes`
2. `POST /api/cashier/invoices` with `{"externalLabIntakeId":"<external-intake-id>"}`
3. `POST /api/cashier/invoices/<invoice-id>/discount-requests` with `{"amount":"25.00","reason":"Synthetic discount request"}`
4. `GET /api/clinic-manager/billing/discount-approvals`
5. `POST /api/clinic-manager/billing/discount-approvals/<approval-id>/decision` with `{"decision":"APPROVE"}`
6. `POST /api/cashier/invoices/<paid-invoice-id>/refund-requests` with `{"reason":"Service was not provided","items":[{"invoiceItemId":"<unprovided-item-id>"}]}`
7. `GET /api/clinic-manager/billing/refund-approvals`
8. `POST /api/clinic-manager/billing/refund-approvals/<refund-id>/decision` with `{"decision":"APPROVE"}`
9. `GET /api/cashier/refunds/worklist`
10. `POST /api/cashier/refunds/<refund-id>/complete` with `{}` for cash, or `{"transactionReference":"<synthetic-reference>"}` for POS/e-wallet
11. `GET /api/billing/reports/financial?from=2026-11-01&to=2026-11-12`

The server rejects caller-selected actors, invoice totals, refund amounts, payment methods, and status fields. Do not manually change issued invoice rows to simulate refunds or discounts.
