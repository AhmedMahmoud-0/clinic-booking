# Phase 2D — Billing and Operations

## Scope
This is a schema-only update for the single-branch MERUNO outpatient clinic. It does not add payment gateways, insurance, installments, partial payments, or a full accounting ledger. No migration is generated or applied.

## Models

| Model | Purpose |
|---|---|
| `Invoice` | Encounter-linked invoice header with totals and lifecycle status |
| `InvoiceItem` | Service, lab, radiology, or other performed line with price/description snapshot |
| `Payment` | On-site full payment attempt/record, with cash, POS card, or clinic e-wallet method |
| `DiscountApproval` | Requested/decided invoice discount with reason and employee references |
| `Refund` | Refund request/approval/completion for one or more invoice items |
| `RefundItem` | Amount refunded against a specific invoice item |
| `Complaint` | Online, phone, in-person, or patient-portal complaint with reference number |
| `ComplaintEvent` | Append-only complaint lifecycle and note history |
| `IncidentReport` | Confidential operational/patient-safety incident record |
| `Attachment` | Metadata and opaque storage key for separately stored files |
| `Notification` | Patient/employee notification lifecycle |
| `AuditLog` | Minimal actor/action/entity/time metadata; no clinical snapshots |

## Important business invariants

1. An invoice is tied to an encounter, not merely to a booking. The application must verify the encounter is completed and every invoice line represents a service already provided before issuing the invoice.
2. Payment is full-only. Do not create partial payment or installment workflows. In Phase 2E, add a PostgreSQL partial unique index so an invoice can have at most one `COMPLETED` payment. The service layer must ensure the amount equals the outstanding invoice total inside a transaction. Voided attempts may be retained.
3. Allowed payment methods are `CASH`, `POS_CARD`, and `CLINIC_E_WALLET`. No online gateway is included.
4. Discounts require an approved `DiscountApproval` and a recorded reason. Phase 3 role authorization must ensure only an authorized manager approves and requester/approver separation is respected.
5. Refunds require approval and preserve the original invoice. `RefundItem` identifies the exact invoice item so a not-provided service can be refunded without cancelling other items. Phase 2E/service transactions must prevent cumulative refunds from exceeding the eligible, unprovided balance for that item.
6. Complaint events provide a traceable timeline. Reception may record an in-person, phone, or verbal complaint; public submissions may have no linked patient record. A reference number is required.
7. Incident reports are confidential. The database model does not replace role-based authorization. Implement least-privilege access in Phase 3.
8. Attachments store metadata and an opaque `storageKey`; bytes are stored outside PostgreSQL. Permit only PDF/JPEG/PNG in the upload service. Phase 2E must add checks for positive size, one owning record, and purpose/owner consistency. Never store executable files or DICOM/PACS objects.
9. Notifications support in-app, email, and browser push only where supported/consented. For result-ready notifications, title/message must not contain result values, diagnosis, or other medical details. Phase 2E should enforce exactly one target (`patientId` XOR `employeeId`).
10. Audit logs contain only actor type/employee, action, entity identifier/type, reason, request id, IP, and timestamp. Do not store PHI, credentials, secrets, or full before/after clinical values.

## Required Phase 2E database/application safeguards

- Money and quantity checks (`subtotal`, `discountTotal`, `total`, `unitPrice`, `lineTotal`, `amount`, `quantity`).
- Invoice total reconciliation and currency consistency.
- Invoice item source exclusivity: at most/exactly one of service/lab/radiology references depending on `sourceType`; `OTHER` has no catalog reference.
- One completed full payment per invoice via partial unique index.
- Refund item aggregate not greater than eligible amount for the invoice item.
- Prevent refunds for provided/completed services; approval and refund completion remain explicit events.
- Attachment ownership XOR, file size and MIME allowlist, plus purpose consistency.
- Exactly one notification recipient.
- Ensure complaint reference uniqueness and retain complaint events.
- Restrict incident access in server-side authorization; no role check is supplied by a client.
- Add any necessary indexes for queue, billing, complaint, attachment and audit access patterns.

## Deferred

Better Auth users/sessions and role permissions are Phase 3. PostgreSQL migrations, CHECK constraints, partial indexes, seed data, and database integration tests are Phase 2E. No database mutation is part of Update 10.
