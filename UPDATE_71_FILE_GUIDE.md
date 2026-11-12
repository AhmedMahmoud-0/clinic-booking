# MERUNO Update 71 — File Guide

## Authorization

- `src/server/auth/authorization/types.ts` — preserves the latest Update 70 Fix 03 patient/appointment permissions and adds the narrow `INVOICE_MANAGE` permission.
- `src/server/auth/authorization/policy.ts` — preserves the latest Fix 03 document-access matrix and grants `INVOICE_MANAGE` to Cashier only. Manager approval permissions remain separate.

## Billing domain

- `src/server/billing/billing-phase-9a-validation.ts` — strict Zod schemas for draft creation, worklist filters, eligible-encounter search, issue action, and full-payment method/reference.
- `src/server/billing/billing-phase-9a-policy.ts` — pure invoice/payment eligibility rules and exact-cent helper.
- `src/server/billing/billing-phase-9a.ts` — transactional invoice draft creation/refresh, issue, full payment collection, unbilled completed-encounter worklist, receipt DTO retrieval, cashier role recheck, row locks, and audit events.

## API routes

- `src/app/api/cashier/invoices/route.ts` — create/refresh invoice draft.
- `src/app/api/cashier/invoices/worklist/route.ts` — invoice worklist.
- `src/app/api/cashier/invoices/eligible-encounters/route.ts` — completed encounters awaiting invoice creation.
- `src/app/api/cashier/invoices/[invoiceId]/route.ts` — invoice details.
- `src/app/api/cashier/invoices/[invoiceId]/issue/route.ts` — issue draft invoice.
- `src/app/api/cashier/invoices/[invoiceId]/payments/route.ts` — collect full payment.
- `src/app/api/cashier/receipts/[paymentId]/route.ts` — retrieve a persisted completed-payment receipt.

## Cashier UI

- `src/components/billing/cashier-invoice-workbench.tsx` — responsive invoice worklist, eligible-encounter lookup, draft creation/refresh, invoice review/issuance, full-payment collection, receipt display, and print action. All visible text is injected through the `copy` prop from existing locale dictionaries. The host Cashier page must mount this component and map the required labels from the project’s existing Arabic/English dictionaries.

## Tests

- `tests/unit/billing-phase-9a-policy.test.ts`
- `tests/unit/billing-phase-9a-validation.test.ts`
- `tests/unit/billing-phase-9a-authorization.test.ts`

## Documentation

- `docs/billing/phase-9a-invoice-and-full-payment.md`
- `docs/billing/phase-9a-9c-invoices-payments-receipts.md`
- `docs/implementation-roadmap.md` — marks Phase 8 verified from the developer's confirmation and records Update 71 as the first Phase 9 increment.
- `APPLY_UPDATE_71.md`
- `UPDATE_71_SUMMARY.txt`

## Database changes

None. Phase 2D already introduced the Invoice, InvoiceItem, Payment, DiscountApproval, Refund, and RefundItem models, and Phase 2E supplied the PostgreSQL integrity layer. Update 71 uses the existing schema and migration history. Do not apply `db push`, generate a migration, or edit migration history for this update.
