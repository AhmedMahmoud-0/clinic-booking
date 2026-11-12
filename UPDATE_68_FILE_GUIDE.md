# Update 68 — Phase 8D–8E File-by-File Guide

## Scope

This update completes the internal laboratory result lifecycle after Update 67: submit a draft, independently review/approve or return it for correction, release approved results, record critical-result communications, enforce ordering-Doctor read-back, support escalation, and let the ordering Doctor record a clinical review. An approved critical result is visible to the assigned Doctor before release only while a NOTIFIED/ESCALATED read-back communication is pending, avoiding a notification/read-back deadlock.

External lab referrals and external-patient intake (8F) are deliberately grouped with radiology scheduling/preparation in Update 69. Those workflows need a separate external-case/scheduling lifecycle and should not be partially represented by an ordinary internal Encounter or LabOrder.

## New server files

| File | Purpose |
| --- | --- |
| `src/server/laboratory/lab-result-review-policy.ts` | Pure state/policy decisions for submission, independent review, release, critical read-back, escalation, and Doctor clinical review. |
| `src/server/laboratory/lab-result-review-validation.ts` | Strict Zod request schemas; client-selected actor, status, timestamp, and reviewer fields are rejected. |
| `src/server/laboratory/lab-result-review.ts` | Server-only transactions implementing the result lifecycle, critical communication, worklists, notifications, ordering-Doctor checks, and AuditLog entries. |

## New Route Handlers

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/lab/results/worklist` | GET | Minimal queue of results awaiting Lab Staff review. |
| `/api/lab/order-items/:orderItemId/result/submit` | POST | Submit the original author's DRAFT result for independent review. |
| `/api/lab/results/:resultId/review` | POST | Approve or return a pending result for correction. Author self-review is forbidden. |
| `/api/lab/results/:resultId/release` | POST | Release an approved result and advance its order item/order lifecycle. |
| `/api/lab/results/:resultId/critical-communications` | POST | Record method and recipient for a critical-result notice; create a non-PHI in-app alert for the ordering Doctor. |
| `/api/lab/critical-communications/worklist` | GET | Lab Staff queue for unacknowledged or escalated communications. |
| `/api/lab/critical-communications/:communicationId/acknowledge` | POST | Ordering Doctor confirms read-back. |
| `/api/lab/critical-communications/:communicationId/escalate` | POST | Lab Staff records an escalation reason when acknowledgment has not arrived. |
| `/api/doctor/lab-results/:resultId` | GET | Ordering Doctor reads a released result; an approved critical result with an outstanding read-back request is viewable before release for the read-back workflow. |
| `/api/doctor/lab-results/:resultId/review` | POST | Ordering Doctor records REVIEWED or FOLLOW_UP_REQUIRED. |

## Tests

| File | Coverage |
| --- | --- |
| `tests/unit/lab-result-review-policy.test.ts` | 27 policy cases covering submission, author separation, approval, release, critical read-back, escalation, and clinical review. |
| `tests/unit/lab-result-review-validation.test.ts` | 16 strict request-validation cases covering empty actions, rejection comments, critical notifications, read-back, escalation, and Doctor review. |
| `tests/e2e/lab-result-review.spec.ts` | 10 protected-route checks plus a forged reviewer/timestamp mutation check (11 E2E tests). |

## Existing files replaced

| File | Change |
| --- | --- |
| `README.md` | Marks Phase 7M and Update 67 as locally verified; records Update 68 as the current increment and separates Update 69 scope. |
| `docs/implementation-roadmap.md` | Records Update 67 verification, describes 8D–8E workflow rules, and moves 8F into Update 69 with 8G–8H. |

## Existing schema reused — no migration

No Prisma schema, migration, seed, package, dependency, environment variable, or generated-client change is included. The update reuses `LabResult`, `LabResultReview`, `LabCriticalCommunication`, and `LabClinicalReview`, plus existing Employee roles, permissions, Notification, and AuditLog models.

Important integrity rules:

- Only the original Lab Staff author can submit their own draft.
- A different active Lab Staff member must review it.
- Rejected results return to DRAFT while the review row remains in history.
- Release is allowed only from APPROVED.
- If any component has `CRITICAL_LOW` or `CRITICAL_HIGH`, every recorded critical communication must have ordering-Doctor read-back acknowledgement before release.
- Escalation does not bypass read-back.
- Only the Doctor assigned to the originating Encounter can acknowledge or clinically review the result.
- Clinical review is recorded only after release; FOLLOW_UP_REQUIRED requires notes.
- Notification text contains no patient identity, test name, component value, or clinical result.

No changes are made to existing lab samples, result values, approved records, or migration history.
