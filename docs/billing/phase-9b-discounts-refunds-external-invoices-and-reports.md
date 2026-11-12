# Phase 9B — Discounts, refunds, external diagnostic invoices, and financial reports

## Discount lifecycle

1. Cashier submits a positive fixed-amount discount request against a draft invoice with a required reason.
2. The server locks the invoice, verifies the active Cashier assignment, ensures no pending request exists, and checks the amount against the remaining draft balance.
3. Clinic Manager reviews the invoice, request reason, requester, amount, and current totals.
4. The manager may approve or reject. Rejection requires a reason. The requester cannot decide their own request.
5. Approval updates only the draft invoice's `discountTotal` and `total` and records the manager and decision timestamp. The original line items are retained.

Discount allocation is calculated in integer cents for refund calculations. The final line receives the exact rounding remainder so allocated net line amounts sum to the invoice total.

## Refund lifecycle

1. Cashier selects one or more invoice items and records a reason.
2. The server requires exactly one completed original payment and a PAID/PARTIALLY_REFUNDED invoice.
3. Only an invoice line whose linked source is explicitly recorded as cancelled/not provided can be refunded. Refund amounts are calculated server-side as the remaining net line amount after discount allocation and any active pending/approved/completed refund reservations. Client-supplied amounts are rejected.
4. Clinic Manager approves or rejects the request. The requester cannot decide their own request; rejection requires a reason.
5. Cashier completes an approved refund using the original completed payment method. POS card and clinic e-wallet refunds require a transaction reference. The refund stores the decision employee, execution employee, method, reference, and timestamps.
6. The original Invoice, InvoiceItem, and Payment rows remain present. The Invoice status changes to PARTIALLY_REFUNDED or REFUNDED based on completed refund totals.

The request and completion transactions lock the invoice row and run at Serializable isolation to prevent duplicate or concurrent over-refunds.

## Supported invoice sources

- **Completed Encounter:** existing Update 71 path. Appointment service snapshots, released internal laboratory items, and completed in-clinic radiology items remain billable under the existing workflow.
- **External diagnostic intake:** an invoice can be linked to one `ExternalLabIntake` rather than an Encounter. Only released in-clinic laboratory items are billable. The patient on the invoice must match the patient on the source intake. Existing draft invoices remain visible for refresh when further results are released.
- **Walk-in consultation:** the cashier selects an active consultation service assigned to the encounter's doctor. The description and price are snapshotted to the draft line. The cashier cannot change the service snapshot after the draft line has been created.

The database enforces exactly one invoice source (`Encounter` XOR `ExternalLabIntake`) and verifies patient-to-source consistency for invoice writes.

## Financial reports

The report endpoint accepts a date range of at most 93 calendar days and calculates Cairo-local period boundaries using `Africa/Cairo`. It returns invoice totals, approved discounts, net billed amount, payments collected, completed refunds, net collected, currently outstanding issued invoices, counts, payment-method totals, and daily collection/refund breakdowns. Mixed currency totals are rejected rather than combined.

## Routes

| Route | Purpose | Permission |
|---|---|---|
| `POST /api/cashier/invoices/:invoiceId/discount-requests` | Request a draft discount | `INVOICE_MANAGE` + active Cashier role |
| `GET /api/clinic-manager/billing/discount-approvals` | Pending discount approvals | `DISCOUNT_APPROVE` |
| `POST /api/clinic-manager/billing/discount-approvals/:approvalId/decision` | Approve/reject discount | `DISCOUNT_APPROVE` + active Clinic Manager role |
| `POST /api/cashier/invoices/:invoiceId/refund-requests` | Request selected unprovided line refunds | `REFUND_REQUEST` + active Cashier role |
| `GET /api/clinic-manager/billing/refund-approvals` | Pending refund approvals | `REFUND_APPROVE` |
| `POST /api/clinic-manager/billing/refund-approvals/:refundId/decision` | Approve/reject refund | `REFUND_APPROVE` + active Clinic Manager role |
| `GET /api/cashier/refunds/worklist` | Approved refunds awaiting execution | `REFUND_REQUEST` |
| `POST /api/cashier/refunds/:refundId/complete` | Complete an approved refund | `REFUND_REQUEST` + active Cashier role |
| `GET /api/cashier/invoices/eligible-external-intakes` | Eligible external diagnostic intake worklist | `BILLING_READ` |
| `GET /api/billing/reports/financial` | Aggregated financial report | `BILLING_READ` |

All mutation routes enforce same-origin requests, strict JSON validation, server-resolved employee identity, domain-state validation, and audit logging.

## Database migration

One incremental migration:

`20261112010000_billing_phase_9b_discounts_refunds_and_external_invoices`

It makes `Invoice.encounterId` optional, adds `Invoice.externalLabIntakeId` and its foreign key/unique index, adds the exclusive-source check and patient-source trigger, and adds Refund decision/execution employee and payment-channel fields with supporting foreign keys, indexes, and a completed-refund audit-state check. It does not drop or rewrite existing billing rows.

## UI and localization

`CashierBillingWorkspace` and `ClinicManagerBillingWorkspace` compose the new billing workbenches. All visible strings arrive through typed `copy` props, and monetary/date formatting uses the supplied active locale. The application page should map these props to existing translation values; this update intentionally adds no translation keys or second localization mechanism.
