# Phase 8G–8H — Radiology scheduling, identity, preparation, and X-ray screening

## Scheduling

- Radiology Staff can schedule a pending radiology order item to an active resource whose modality matches the ordered procedure.
- The server calculates end time using the catalog procedure's configured duration. Requests must contain an explicit timezone offset and a future start instant; clients cannot choose end time, state, or actor.
- Resource rows and order-item rows are locked inside a serializable transaction. Migration 15 also adds a PostgreSQL GiST exclusion constraint that prevents overlapping active exams on the same resource and checks existing scheduled data before installation.
- Rescheduling is locked after identity verification, preparation, or pregnancy screening has begun.

## Exam-day checks

- Radiology Staff verify the patient's identity using two distinct stored identifiers through the existing Phase 5B matcher. Submitted values are not persisted.
- Preparation is recorded as `CONFIRMED`, `NOT_REQUIRED`, or `ISSUE_REPORTED`; a reason is required for the latter two states.
- Digital X-ray requires exam-day pregnancy screening after identity and preparation checks. `NOT_APPLICABLE` and `DECLINED` require a reason.
- Positive or declined screening is placed in a Radiologist-only review worklist. The Radiologist must record `AUTHORIZE_AFTER_REVIEW` or `DEFER_EXAM`, with review notes. A deferred exam is cancelled together with its order item; if all items are cancelled, the parent order is cancelled.
- The readiness endpoint combines exam/order state, identity, preparation, modality-specific screening, and Radiologist decision. It returns a `canStartInPhase8I` flag but does not start the exam.

## Boundaries

Only digital X-ray and ultrasound are supported. This increment does not implement exam execution, report authoring/approval/release, PACS/DICOM, CT, MRI, mammography, or automated clinical advice. Use synthetic data only.
