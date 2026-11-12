# Update 67 — Phase 8A–8C: Internal Laboratory Workflow

## Purpose

This increment starts Phase 8 with the internal laboratory workflow for Lab Staff: worklist, patient identity verification, sample collection and receipt/rejection, controlled recollection after rejection, processing, and draft result entry.

It deliberately stops at `LabResultStatus.DRAFT`. It does not approve or release results, send critical-result communications, implement the external laboratory workflow, or add Laboratory UI. Those belong to Update 68 and later planned increments.

## New files

| File | Purpose |
| --- | --- |
| `src/server/laboratory/lab-workflow-policy.ts` | Pure eligibility and lifecycle policies for Lab Staff access, collection, receipt/rejection, processing, and draft result editing. |
| `src/server/laboratory/lab-workflow-validation.ts` | Strict Zod contracts for identity-verified sample collection, sample transitions, and result drafts. Reuses the existing Phase 5B identity schema. |
| `src/server/laboratory/lab-workflow.ts` | Server-only service implementing minimal worklist DTOs, transactional identity verification, collection, sample receipt/rejection, processing, draft results, and audit events. |
| `src/app/api/lab/worklist/route.ts` | Protected Lab Staff worklist endpoint. |
| `src/app/api/lab/order-items/[orderItemId]/collect/route.ts` | Protected sample collection endpoint; requires two distinct identity elements. |
| `src/app/api/lab/samples/[sampleId]/route.ts` | Protected sample RECEIVE/REJECT endpoint. |
| `src/app/api/lab/order-items/[orderItemId]/process/route.ts` | Protected transition into laboratory processing. |
| `src/app/api/lab/order-items/[orderItemId]/result/route.ts` | Protected draft result entry/update endpoint. |
| `tests/unit/lab-workflow-policy.test.ts` | Unit coverage for access and workflow transitions. |
| `tests/unit/lab-workflow-validation.test.ts` | Strict request validation and result-value contract tests. |
| `tests/unit/lab-workflow-migration.test.ts` | Contract checks for the migration and history-preserving schema changes. |
| `tests/e2e/lab-workflow.spec.ts` | Authentication, no-store, and forged-field E2E boundary tests for the new routes. |
| `prisma/migrations/20261110233000_lab_sample_recollection_history/migration.sql` | Migration 14: specimen-type snapshot and historical recollection support. |

## Existing files replaced

| File | Change |
| --- | --- |
| `prisma/schema.prisma` | Adds nullable `LabSample.specimenTypeSnapshot`; changes `LabOrderItem` → `LabSampleItem` from one-to-one to one-to-many so rejected samples remain in history and a later recollection can be linked; retains uniqueness within each individual sample; adds an order-item/time index. |
| `README.md` | Records Update 67 as the current Phase 8 increment and documents that verification is pending. |
| `docs/implementation-roadmap.md` | Splits Phase 8 into 8A–8J and records delivery grouping across Updates 67–70. |

## Reused existing infrastructure

- `CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE` and the existing `LAB_STAFF` role assignment. No new role or permission is introduced.
- Phase 5B `patientIdentityVerificationSchema` and `verifyPatientIdentityMatch`. Submitted identity values are compared in memory; only the identifier types, outcome, actor, and timestamp are persisted.
- Existing Doctor-created `LabOrder`, `LabOrderItem`, `LabTest`, `LabTestComponent`, `LabResult`, `LabResultValue`, `LabSample`, and `LabSampleItem` models.
- Existing `AuditLog` and server-side permission Route Handler wrappers.

## Workflow and safety behavior

1. The worklist returns minimal patient/order/test context and open items only.
2. Collection requires two distinct identifiers supported by the current Patient model. The patient must be active and both identifiers must match the linked Encounter patient. Failed verification creates no sample.
3. The service records identity-verification metadata but never stores submitted values or includes them in audit text.
4. A sample records the collection-time specimen type, collector, and server timestamp. Sample/order-item transitions run transactionally and use row locks/serializable isolation.
5. A collected sample can be received or rejected. Rejection requires a bounded reason. Rejected samples are retained; a new collection is allowed only when the latest sample for that item is rejected.
6. Processing can start only after the latest sample has been received.
7. Result entry is limited to active components on the ordered LabTest. Each component must use exactly its catalogue value type. Component code/name, unit, and reference range are stored as snapshots.
8. A result remains `DRAFT`; only its original author may edit it. No approval or patient release occurs in this increment.
9. Routes reject query-string mutations, enforce same-origin on writes, use strict request bodies, and do not trust client-selected actor/status/timestamp fields.

## Migration 14 details

Migration: `20261110233000_lab_sample_recollection_history`.

- Adds `LabSample.specimenTypeSnapshot VARCHAR(100)` as a nullable column.
- Backfills that new column from the linked `LabTest.specimenType` for existing synthetic samples.
- Drops the prior unique index on `LabSampleItem.orderItemId` so a rejected item can later be assigned to a new sample.
- Creates a non-unique `(orderItemId, createdAt)` index to retrieve the latest sample in order.
- Keeps the per-sample unique `(sampleId, orderItemId)` key.
- Does not delete or rewrite existing samples, order items, results, patients, audit events, or migration history.

## Explicit exclusions

No result review/approval/release, clinical review, critical-result read-back/escalation, external lab referral/intake, radiology scheduling/exam/report workflows, patient portal result display, UI, dependency, package, environment, or seed changes are included.
