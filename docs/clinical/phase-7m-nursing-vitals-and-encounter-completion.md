# Phase 7M — Nursing Tasks, Vital Signs, and Encounter Completion

## Nursing task lifecycle

The Doctor assigned to an active Encounter can assign a bounded task to an active employee with the Nurse role. Supported types are recording vital signs, repeating vital signs, pre-consultation assessment, procedure preparation, and other documented nursing work. The Nurse's worklist is derived from the authenticated employee identity and exposes only assigned tasks and minimum operational patient context.

Task lifecycle: `PENDING → IN_PROGRESS → COMPLETED`; an in-progress task can instead be `ESCALATED`, after which the Doctor may resume it or cancel it. A Doctor may cancel an unresolved task with a persisted cancellation note. Completed/cancelled tasks are terminal. Each transition is audited.

## Vital signs

Measurements are appended to the existing Phase 2B `VitalSign` model and linked to a started `RECORD_VITAL_SIGNS` or `REPEAT_VITAL_SIGNS` nursing task. Supported values: temperature, systolic/diastolic blood pressure, pulse, respiratory rate, oxygen saturation, height, and weight. BMI is computed by the server only when height and weight are present in the same measurement submission; a derived value that exceeds the existing database field precision is rejected before persistence.

Broad plausibility bounds reject invalid data-entry values but intentionally allow concerning readings to be recorded; they do not classify results as clinically normal/abnormal or function as clinical alert thresholds. A Nurse who sees a concerning reading or symptom must explicitly escalate the in-progress task to the Doctor; this update does not define clinical thresholds or automated triage.

## Encounter completion

Only the assigned active Doctor can complete their own Encounter. Required conditions:

- one and only one signed `INITIAL_ASSESSMENT` note exists and it was signed by that Doctor;
- no nursing task remains `PENDING`, `IN_PROGRESS`, or `ESCALATED`;
- no prescription remains `DRAFT`;
- the Encounter is `IN_PROGRESS`, its completion timestamp is null, and its originating appointment/Walk-in linkage is consistent.

For a scheduled appointment, the transaction first locks and completes its linked `APPOINTMENT` QueueEntry (`IN_SERVICE → COMPLETED`), then completes the Appointment (`IN_CONSULTATION → COMPLETED`) and writes `AppointmentStatusHistory`. For a Walk-in, it completes the linked `WALK_IN` QueueEntry (`IN_SERVICE → COMPLETED`). It then completes the Encounter and writes an audit event in the same transaction. Appointment Encounter consistency checks require the related APPOINTMENT QueueEntry to match the same patient and Doctor; a missing or mismatched queue ticket fails closed. Diagnostic orders and referrals may remain open because their results/follow-up can occur after the visit.

## Security and data handling

No identity, status, actor, timestamp, BMI, or historical snapshot is accepted from the client. Nurses cannot access tasks assigned to another Nurse or other Encounters through these routes. Audit events contain operation metadata only, not measurements or clinical notes. Notification content is a minimal internal pointer to the Encounter.

All records remain synthetic demo data. This remains a portfolio application, not production clinical software. The update does not add automatic clinical threshold alerts, medication decision support, patient portal display, or a Doctor/Nurse UI.
