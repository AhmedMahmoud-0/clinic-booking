# Phase 9A–9C — Invoices, full payment, cashier workbench, and receipts

## Scope

This increment groups invoice preparation/issuance, full in-clinic payment, receipt retrieval/printing, and the cashier invoice workbench. It uses the existing Invoice, InvoiceItem, Payment, and AuditLog models and the existing PostgreSQL integrity layer.

## Cashier flow

1. Find a completed Encounter without an invoice through `GET /api/cashier/invoices/eligible-encounters`. The response contains only patient identity and operational appointment information.
2. Create/refresh a draft using `POST /api/cashier/invoices` with `encounterId`.
3. Review the invoice using `GET /api/cashier/invoices/{invoiceId}`.
4. Issue the draft using `POST /api/cashier/invoices/{invoiceId}/issue`. Pending services block issuance.
5. Collect the exact full server-calculated amount using `POST /api/cashier/invoices/{invoiceId}/payments`. Supported methods are CASH, POS_CARD, and CLINIC_E_WALLET. POS/e-wallet requires a transaction reference.
6. Retrieve the persisted receipt using `GET /api/cashier/receipts/{paymentId}`. The cashier workbench presents the receipt and exposes browser printing.

## UI integration

`src/components/billing/cashier-invoice-workbench.tsx` is a reusable client workbench. It receives `copy` and `locale` props. Bind the copy values to the project's existing translation dictionaries and mount the component in the existing Cashier workspace invoices page. The component intentionally does not declare or hardcode translation keys.

## Security and integrity

- Server routes enforce `INVOICE_MANAGE`, `PAYMENT_COLLECT`, or `BILLING_READ` as appropriate.
- The billing service independently verifies an active Cashier role for draft, issue, and payment mutations.
- Client-supplied amounts, patient IDs, actor IDs, and status values are never accepted.
- Invoice/Encounter and Invoice rows are locked inside serializable transactions for mutations.
- Only completed services are added to invoice items; the item source IDs are unique and refresh is idempotent.
- Exactly one full completed payment is collected; no partial payment, online gateway, or installment support is added.
- Manager approval capabilities remain separate from Cashier mutation capabilities.
- Receipt reads disclose only invoice/payment details required for billing, not clinical records or report contents.

## Database

No schema changes or migrations are included. Do not run schema push, migration generation, migration deployment, or migration reset for this update.
