# Apply MERUNO Update 71 — Phase 9A

Update 71 groups Phase 9A plus the cashier invoice/payment/receipt slice of 9C: Encounter-linked invoice drafts, issuance, full in-clinic payment collection, the cashier invoice workbench, and persisted receipt retrieval/printing. Apply it on top of the verified Update 70 + Fix 01–03 project.

## 1. Back up first

Back up the project folder and PostgreSQL database. Keep the existing migration history intact.

## 2. Merge the ZIP

Extract the ZIP into a temporary folder and merge its contents into the project root. Overwrite only the matching paths in `UPDATE_71_FILE_GUIDE.md`. Do not replace the project directory, `prisma/schema.prisma`, generated Prisma Client, or any migration folder.

The authorization files in this package are based on the latest Update 70 Fix 03, not the pre-fix Update 70 permission matrix. This preserves the patient permissions and Reception-only patient-document policy that were just verified.

## 3. No database migration

This update does not change Prisma schema or PostgreSQL constraints. Do not run `db push`, `migrate dev`, `migrate reset`, `migrate deploy`, or a migration preview for Update 71. Do not edit `_prisma_migrations`.

## 4. Run checks in order

```bash
npm run typecheck
npm run lint
npm test
npx playwright test --workers=1
npm run build
```

Stop at the first failure and send the complete output. Do not proceed to another Phase 9 increment until all checks pass.

## 5. UI translation integration

`src/components/billing/cashier-invoice-workbench.tsx` is a reusable client component. Mount it in the existing Cashier invoice workspace and supply its `copy` prop from the existing Arabic/English translation dictionaries. Do not hardcode translated UI text or create a second translation mechanism. `locale` should be the active locale string (`ar-EG` or `en-US`, or the project's equivalent). Required `copy` fields are declared in the exported `CashierBillingCopy` type; map them to existing translation values in the Cashier workspace. The package deliberately does not guess the project’s translation import path or add duplicate keys.

## 6. Expected behavior

- Only a completed Encounter can have an invoice draft.
- Appointment consultation lines use booked price snapshots; Lab lines require a released result; Radiology lines require a completed exam.
- Draft refresh is idempotent and adds newly completed services without duplicating existing lines.
- Issuance is blocked while any related non-cancelled service remains pending, when a new billable service is missing from the draft, or when a draft line is no longer billable.
- Payment can only be collected on an issued invoice, exactly once, for the full server-calculated total.
- Cash, POS card, and clinic-supported e-wallet are the only payment methods. POS/e-wallet requires a transaction reference. A linked Appointment patient must match the Encounter patient.
- Manager approvals remain separate from Cashier invoice issuance and collection.

## 7. API smoke-test sequence

Use an authenticated Cashier session and same-origin requests. Replace the example identifiers with synthetic local records. Never use real patient data.

1. `GET /api/cashier/invoices/eligible-encounters`
2. `GET /api/cashier/invoices/worklist`
3. `POST /api/cashier/invoices` with `{"encounterId":"<completed-encounter-id>"}`
4. `GET /api/cashier/invoices/<invoice-id>`
5. `POST /api/cashier/invoices/<invoice-id>/issue` with `{}`
6. `POST /api/cashier/invoices/<invoice-id>/payments` with `{"method":"CASH"}`
7. `GET /api/cashier/receipts/<payment-id>`

For POS card or clinic e-wallet, also supply `transactionReference`. The API deliberately does not accept amount, patient ID, currency, actor ID, invoice total, or payment status from the client.

## 8. Phase boundaries

This increment does not yet implement discounts, refunds, diagnostic-only external-intake billing, or walk-in consultation pricing snapshots. Discounts/refunds, Manager approval worklists, financial reporting, diagnostic-only external-intake billing, and walk-in pricing snapshots are grouped into Update 72. Do not manually adjust issued invoice rows to simulate those workflows.
