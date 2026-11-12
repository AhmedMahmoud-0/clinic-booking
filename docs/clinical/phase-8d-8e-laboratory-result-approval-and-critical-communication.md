# Phase 8D–8E — Laboratory Result Approval, Release, and Critical Communication

## Scope

This increment completes the internal laboratory result lifecycle after Update 67's DRAFT entry:

1. The original Lab Staff author submits a complete result draft for review.
2. A different active Lab Staff employee independently approves it or returns it for correction.
3. An approved result is released through a guarded operation. The corresponding order item becomes RESULTED; the parent order becomes COMPLETED only when every item is RESULTED or CANCELLED.
4. If any result value is explicitly flagged `CRITICAL_LOW` or `CRITICAL_HIGH`, release is blocked until all recorded critical communications have a successful ordering-Doctor read-back acknowledgement.
5. Lab Staff record how and to whom a critical result was communicated. If the first contact does not acknowledge, Lab Staff can escalate with a reason. The assigned ordering Doctor can acknowledge the communication only after confirming read-back.
6. The ordering Doctor can view the released result and append a clinical decision: REVIEWED or FOLLOW_UP_REQUIRED. A narrow pre-release exception allows the assigned Doctor to view an already-approved critical result only while a NOTIFIED or ESCALATED read-back communication is open; this prevents the notification/read-back flow from deadlocking behind the release gate.

## Existing schema reused

No Prisma schema change or migration is included. The increment reuses:

- `LabResult` and `LabResultStatus` (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `RELEASED`, ...)
- `LabResultReview` and `LabResultApprovalDecision`
- `LabCriticalCommunication`, `CriticalCommunicationStatus`, and `CriticalCommunicationMethod`
- `LabClinicalReview` and `DiagnosticReviewDecision`
- Existing Employee roles and `AuditLog`

## State rules

- Only the author may submit their own DRAFT result.
- Only a different active Lab Staff employee may review a PENDING_REVIEW result.
- Approval sets `approvedByEmployeeId` and `approvedAt` on the server. Rejection records a review event and returns the result to DRAFT without deleting the review history.
- Only an APPROVED result can be released.
- A result with critical flags cannot be released until every communication record has status ACKNOWLEDGED and a non-null `readBackConfirmedAt`.
- Only the active Doctor assigned to the originating Encounter can acknowledge a critical communication or clinically review its released result. Before release, that Doctor can read an approved result only when an outstanding critical read-back communication exists.
- Escalation does not count as read-back acknowledgement and therefore does not bypass the release guard.
- Result content, result status, reviewer, actor, approval/release timestamps, and read-back timestamps are never accepted from the client.

## New endpoints

- `GET /api/lab/results/worklist`
- `GET /api/lab/critical-communications/worklist`
- `POST /api/lab/order-items/:orderItemId/result/submit`
- `POST /api/lab/results/:resultId/review`
- `POST /api/lab/results/:resultId/release`
- `POST /api/lab/results/:resultId/critical-communications`
- `POST /api/lab/critical-communications/:communicationId/acknowledge`
- `POST /api/lab/critical-communications/:communicationId/escalate`
- `GET /api/doctor/lab-results/:resultId`
- `POST /api/doctor/lab-results/:resultId/review`

## Exclusions and next increment

This update does not implement external-laboratory referrals, outside-patient intake, billing for external patients, or radiology workflows. Those are not folded into this result-approval increment because external cases require a separate intake/scheduling lifecycle and foreign-key ownership rules. They are grouped in Update 69 with radiology scheduling and preparation. No patient-facing result portal or staff UI is added here.
