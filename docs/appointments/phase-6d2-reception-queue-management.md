# Phase 6D2 — Reception Doctor Queue Board and Call Next

## Purpose

Provide Reception with a protected, current-day queue view for one doctor and a safe operation to call the next waiting ticket. This is an API/domain increment; it does not build the visual Reception queue workspace.

## Routes and authorization

- `GET /api/reception/queue?doctorId=<doctorId>` reads the selected active doctor's current Cairo-local-day queue.
- `POST /api/reception/queue/call-next` accepts a strict JSON body containing only `doctorId`.

Both routes require the existing `appointment.manage` permission. The mutation also requires same-origin validation. Each service call independently rechecks that the acting employee is active and holds an active `RECEPTION` role assignment.

## Queue data and privacy

The GET route returns ticket number, queue type/status, check-in/call/service/completion timestamps, elapsed waiting minutes where applicable, patient name/MRN/active flag, and appointment time. It does not return contact details, identity-verification values, encounter data, diagnoses, prescriptions, orders, results, or any other clinical record.

The queue is scoped to the current Cairo-local date and one doctor. It is ordered by the server-assigned queue number. Summary counts are calculated from the persisted queue states: `WAITING`, `CALLED`, `IN_SERVICE`, `COMPLETED`, `LEFT`, and `CANCELLED`.

This endpoint is Reception-only and must never be reused for a public waiting-room display. A future public display must use ticket numbers and must not expose patient names or MRNs.

## Call-next behavior

The POST route does not accept a queueEntryId, patientId, queue number, status, timestamp, or actor. The server:

1. Rechecks the active Reception employee inside a Serializable transaction.
2. Locks the selected `DoctorProfile` row, sharing the per-doctor mutex already used by check-in and queue-number allocation.
3. Rechecks that the doctor profile and employee are active.
4. If a ticket is already in `CALLED`, returns that same ticket idempotently; it does not call a second patient.
5. Otherwise selects the oldest `WAITING` ticket by queue number.
6. Blocks without skipping or reordering if the patient at the head is inactive.
7. Conditionally updates exactly that entry from `WAITING` to `CALLED`, sets `calledAt`, and writes a PII-minimal `AuditLog` event.

This increment changes `QueueEntry` only. The appointment remains `CHECKED_IN`; doctor-side encounter creation and the transition into service belong to the Doctor workspace phase.

## Concurrency

`DoctorProfile FOR UPDATE` serializes simultaneous call-next requests for the same doctor. Conditional status updates and Serializable isolation protect against stale queue state. The shared lock is consistent with the `allocateNextDoctorQueueNumber` helper used by check-in and reserved for future Walk-in queue creation. An unlocked queue read followed by a separate update is not permitted.

## Not included

- Visual Reception queue workspace, realtime/polling, public queue display, or patient notifications.
- Moving a ticket to `IN_SERVICE`, `COMPLETED`, `LEFT`, or `CANCELLED`.
- Queue reordering, priority overrides, pausing, doctor transfer, or appointment changes.
- No-show processing or late-arrival policy changes.
- Walk-in registration, which must use the shared per-doctor queue-number allocator.
- Schema/migration, seed, package, dependency, environment, or configuration changes.

All queue and patient data remain synthetic demo data. This portfolio application is not production clinical software.
