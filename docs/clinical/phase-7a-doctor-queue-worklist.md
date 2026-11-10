# Phase 7A — Doctor Queue Worklist (Update 54)

## Purpose

Provide the first Doctor-facing operational read endpoint after Reception has checked in patients, created queue tickets, and called the next patient. This is a server/data foundation only; it does not create a Doctor UI or start an encounter.

## Route and authorization

- `GET /api/doctor/queue`
- Requires the existing `clinical.assigned.read` permission through the shared `withEmployeePermissionRoute` guard.
- The server resolves the employee from the authenticated actor. The caller cannot send an employee ID, doctor profile ID, or patient ID. Query parameters are rejected.
- The service rechecks inside a Repeatable Read transaction that the employee is active, has an active `DOCTOR` role assignment, and has a linked `DoctorProfile`.
- The DoctorProfile is resolved from `Employee.doctorProfile`; there is no `doctorId` query parameter or cross-doctor selection.

## Worklist scope and response

- Return QueueEntry rows for that DoctorProfile and the current `Africa/Cairo` clinic-local queue date only.
- Sort by the already allocated queue number; do not calculate or reassign numbers in this read path.
- Return operational fields only: queue ticket number/type/status/timestamps, patient display name/MRN/active flag, associated appointment status/time, and an existing encounter's status/timestamps.
- Do not return phone, email, date of birth, patient contacts, reason for visit, clinical notes, diagnoses, prescriptions, or diagnostic results.
- Return a summary count for every persisted queue status. Waiting time is shown only for `WAITING` and `CALLED` tickets and never becomes negative.
- Responses use the existing `accountLinkJson` helper and therefore retain the project's no-store response behavior.

## Deliberately not included

- No Doctor UI, schedule/appointment calendar, patient chart, medical history, encounter creation, queue state transition, diagnosis, note, prescription, lab/radiology order, referral, follow-up, Nurse workflow, schema/migration, seed, dependency, package, or environment change.
- No new permission is added. This read operation uses the existing `clinical.assigned.read` capability, while the service enforces Doctor role and DoctorProfile assignment.
- No audit row is written for automatic worklist refreshes. Clinical-chart reads and clinical writes remain subject to their own narrower workflows and audit requirements.

All records remain synthetic. MERUNO is a portfolio/demo project, not production clinical software.
