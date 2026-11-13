# MERUNO Phase 11 — Update 78: Manager Operations

## Objective

Complete the Clinic Manager operational workspace using existing authorization permissions, existing Phase 8–10 data, and the Phase 9B billing workflow. This update adds manager-facing complaint and incident handling, operational reporting, and navigation to the existing discount/refund approval and financial-report workbenches.

## Routes added

| Route | Purpose | Required permission boundary |
|---|---|---|
| `/reception/complaints` | Reception-only intake of phone and in-person complaints | `complaint.intake` |
| `/clinic-manager/complaints` | Complaint worklist, status transitions, and event history | `complaint.manage` |
| `/clinic-manager/incidents` | Confidential incident intake and review | `incident.manage` |
| `/clinic-manager/billing/approvals` | Existing Phase 9B discount/refund approval workbench | `discount.approve` / `refund.approve` on the existing APIs |
| `/clinic-manager/reports/operations` | Aggregate operations report | `operations.report.read` |
| `/clinic-manager/reports/financial` | Existing Phase 9B financial report workbench | `billing.read` on the existing API |

Clinic Manager routes inherit the existing Clinic Manager workspace layout and employee-session guard. The separate Reception complaint route requires `complaint.intake` in its own layout and API. API permissions remain operation-specific; UI navigation is not an authorization boundary.

## Complaint workflow

- Reads at most 100 complaints in received-time order; filters may narrow the queue by status.
- Shows complaint content and operational references only. It does not expose medical notes, diagnoses, prescriptions, diagnostic result values, or attachments.
- Supports explicit transitions only: `RECEIVED → ACKNOWLEDGED / IN_REVIEW / REJECTED`; `ACKNOWLEDGED → IN_REVIEW / RESOLVED / REJECTED`; `IN_REVIEW → RESOLVED / REJECTED`; `RESOLVED → IN_REVIEW / CLOSED`.
- Resolution, closure, and rejection require a manager note.
- Each change writes `ComplaintEvent` and an `AuditLog` entry in one serializable transaction.
- Reception can record phone and in-person complaints through `/reception/complaints`; server-generated reference, RECEIVED status, and receiving employee are persisted with the first `ComplaintEvent` and `AuditLog` entry in one serializable transaction. Reception cannot view the manager queue or change status.
- Optional submitter contact details are collected only when needed and exposed only in the manager complaint worklist.
- One-business-day acknowledgement and five-business-day closure remain operational targets, not guaranteed deadlines.

## Incident workflow

- Manager can record an incident using the existing `IncidentReport` model; the server assigns the reference number and the authenticated employee as reporter.
- The request schema is strict. Client-selected reporter IDs, status, patient IDs, or encounter IDs are not accepted.
- The intake form avoids collecting patient-identifying or clinical detail. Patient/encounter links remain empty in this manager intake path.
- Allowed transitions are explicit. Resolving or closing requires a note.
- Every create/status change produces an `AuditLog` entry. Incident detail displays the most recent audit actions for traceability. The existing schema has no separate incident-event model, so this update does not invent one or add a migration.
- Incident status transitions use serializable transactions to prevent competing updates from creating conflicting state histories.
- Incident access remains confidential under `incident.manage`.

## Operational reporting

- Date filters use Cairo-local midnight boundaries and are limited to 93 calendar days.
- Includes appointments by status, completed visits, new-patient count, cancellations, no-shows, complaints and incident counts, doctor visit counts, and visits by primary specialty (a doctor is counted once to avoid multi-specialty double counting).
- Queue wait is calculated from check-in to service start.
- Diagnostic turnaround is calculated from authored/resulted time to released time for released records only.
- Pending lab review and radiology approval values are current backlog counts as of the report generation date, not counts limited to the selected period.
- No patient identities, diagnoses, clinical notes, laboratory values, or radiology findings are returned.
- Financial detail is deliberately delegated to the existing Phase 9B financial report route, which has its own `billing.read` guard.

## Existing Phase 9B integration

The billing approvals page reuses `ClinicManagerBillingApprovalsWorkbench`, `getDiscountApprovalWorklist`, `getRefundApprovalWorklist`, and the existing discount/refund decision APIs. Financial reporting reuses `BillingFinancialReportsWorkbench` and `/api/billing/reports/financial`. No payment, discount, or refund business logic is reimplemented.

## Database and security

- No Prisma schema changes.
- No migrations or seed changes.
- No package/dependency changes.
- Complaint and incident mutations validate JSON, enforce same-origin requests, and use server-side employee permission guards. Reception intake uses only `complaint.intake`; complaint management remains exclusive to `complaint.manage`.
- Responses use `Cache-Control: no-store` via the existing Clinic Manager response helper.
- Audit reasons are truncated to the existing 500-character database field limit.
