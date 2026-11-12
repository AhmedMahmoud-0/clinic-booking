# Phase 9A — Encounter invoices and full payment collection

## Status

Update 71 implements the initial server-side Cashier billing workflow. Local verification against the developer's project is pending.

## Scope delivered

- Create or refresh one draft invoice for a completed Encounter.
- Snapshot the booked consultation service and price from its completed Appointment.
- Add completed internal laboratory items only after the Lab Result is released.
- Add completed in-clinic radiology procedure items after the exam is completed.
- Keep invoices in DRAFT while any diagnostic item remains unfinished; cancelled line items do not block issuance, while completed items remain billable even if their parent order later has a cancellation status.
- Require the cashier to refresh a draft when newly completed services become billable; issuance also checks that no billable item is missing and no existing draft item has become non-billable.
- Issue a non-empty invoice only after the Encounter is complete and all linked services are completed or cancelled.
- Collect exactly the invoice's server-calculated total in one transaction. The request never accepts a client-supplied amount.
- Accept CASH, POS_CARD, and CLINIC_E_WALLET. POS and wallet entries require a transaction reference; cash may omit it.
- Lock the Invoice while issuing or collecting payment, update Invoice status atomically, and write minimal AuditLog events.
- Keep invoice and payment reads available to roles with `billing.read`; limit draft creation/issuance and collection to the Cashier role through separate permissions.

## API contract

| Method | Endpoint | Purpose | Permission |
| --- | --- | --- | --- |
| GET | `/api/cashier/invoices/worklist` | Filter invoice worklist by `status` and/or `q` | `billing.read` |
| GET | `/api/cashier/invoices/:invoiceId` | Read invoice, line items, and completed payments | `billing.read` |
| POST | `/api/cashier/invoices` | Create or refresh a draft from `encounterId` | `billing.invoice.manage` |
| POST | `/api/cashier/invoices/:invoiceId/issue` | Issue a validated draft; body `{}` | `billing.invoice.manage` |
| POST | `/api/cashier/invoices/:invoiceId/payments` | Collect one full payment using method/reference only | `payment.collect` |

All mutation routes require same-origin validation, JSON bodies, strict Zod validation, server-derived actor identity, and server-side permission checks.

## Billing source and amount rules

- Appointment consultation price comes from the booked price/currency snapshot, never the current catalogue price.
- Lab price comes from `LabOrderItem.priceSnapshot`; an item is billable only when it is RESULTED and its result is RELEASED.
- Radiology price comes from `RadiologyOrderItem.priceSnapshot`; an item is billable only when it is COMPLETED.
- Every invoice line is a snapshot. Invoice totals use Decimal arithmetic and are recalculated from stored line totals. The service also rejects an Appointment whose linked patient conflicts with the Encounter patient.
- The invoice must contain a single currency. A draft with a currency mismatch is rejected rather than silently converted.
- An issued invoice is immutable in this increment. Payment amount and currency are copied from that issued invoice.

## Authorization separation

- Cashier: invoice read, draft management, payment collection, and refund requests (the latter is not implemented in this update).
- Clinic Manager: invoice read and the existing discount/refund approval permissions; no invoice issuance or payment collection capability is added.
- System Admin: no billing read/payment/approval capability is added.

The service rechecks that the authenticated employee is active and has an active CASHIER role before every mutating operation.

## Explicitly not included

- Manager discount requests/decisions and their application to invoices.
- Refund requests, manager approval, item-level refund execution, and original-method reconciliation.
- Billing dashboard, cashier UI, printed/ downloadable receipt layout, revenue reports, and patient-portal invoice display.
- Billing for diagnostic-only external intake records that have no Encounter, and walk-in consultation price snapshots. The existing Invoice schema is Encounter-bound; these paths need an explicit domain/schema treatment rather than a fabricated Encounter or a current-price guess.
- Schema, migration, seed, package, dependency, or environment changes.
- Online gateways, partial payments, installments, insurance claims, or storing card credentials.

## Validation after applying Update 71

Run the project's normal checks:

```bash
npm run typecheck
npm run lint
npm test
npx playwright test --workers=1
npm run build
```

No Prisma migration is included. Do not generate or apply a new migration for this update.
