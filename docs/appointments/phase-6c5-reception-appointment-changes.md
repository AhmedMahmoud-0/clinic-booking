# Phase 6C5 — Reception appointment cancellation and rescheduling (Update 49)

## Scope

This increment gives an authorized Reception employee two server-side operations for an upcoming, confirmed appointment:

- Cancel the appointment with one approved, bounded reason code.
- Move the appointment to a different, available future slot for the same doctor and service, with one approved, bounded reason code.

The operations are available before and inside the 24-hour patient/guest self-service boundary. The service classifies an action as `STANDARD` (at least 24 elapsed hours remain) or `LATE` (less than 24 elapsed hours remain), and persists this classification with the reason code. A late change is a staff-reviewed action, not an automatic penalty or fee.

## Authorization and identity

- Both Route Handlers require `appointment.manage`, exact same-origin protection, a validated employee session, and an active `RECEPTION` role rechecked inside the Serializable transaction.
- The client supplies only the appointment ID, an approved reason code, and (for rescheduling) the new start timestamp.
- The client cannot choose the patient, employee actor, doctor, service, room, duration, price, booking source, or appointment status.
- The service accepts Patient Portal and Reception bookings only when a matching active Patient exists.
- An unresolved public guest appointment is accepted only while the `GuestAppointmentContact` is `PENDING_VERIFICATION`, `resolvedPatientId` is null, and `Appointment.patientId` is null. A linked guest appointment is accepted only when `resolutionStatus = LINKED`, the resolved Patient ID equals `Appointment.patientId`, and that Patient is active.

## Cancellation

- Only an upcoming `CONFIRMED` appointment may be cancelled by this operation. Checked-in, waiting, in-consultation, completed, cancelled, no-show, and past appointments are rejected.
- Accepted reason codes are `PATIENT_REQUESTED`, `DOCTOR_UNAVAILABLE`, `CLINIC_OPERATIONAL`, and `DUPLICATE_BOOKING`.
- The operation moves `CONFIRMED` to `CANCELLED`, records `cancelledAt` and the bounded cancellation reason, writes `STAFF` `AppointmentStatusHistory` with `changedByEmployeeId`, and writes a PII-minimal `RECEPTION_APPOINTMENT_CANCELLED` audit event.
- If the appointment is an unresolved public guest booking, its management-token hash is rotated to an unreachable random hash inside the same transaction. A linked guest token was already revoked during identity resolution.
- This action does not charge a fee, create a refund, or cancel an invoice.

## Rescheduling

- Only an upcoming `CONFIRMED` appointment can be moved; the replacement start must be a different future instant.
- The existing doctor, service, duration, booked-price/currency snapshot, booking reference, source, and confirmation timestamp are preserved. Only start/end instants and the consultation-room assignment may change.
- A configured service-duration change since the original booking requires separate review and is rejected here rather than silently altering the booked visit.
- Public availability is recalculated inside the Serializable transaction while excluding only the appointment being moved. The service separately rechecks patient conflicts and room conflicts. Patient-overlap exceptions are not inferred or granted by this workflow.
- A successful move writes a `STAFF` `CONFIRMED` → `CONFIRMED` history event with previous/new UTC instants, bounded reason code, timing classification, employee actor, and timestamp; it also writes `RECEPTION_APPOINTMENT_RESCHEDULED` to the audit log.
- For an unresolved guest appointment, the guest management token remains valid after rescheduling. For a linked guest appointment, it remains revoked.

## Concurrency and privacy

- The transaction is Serializable.
- For Patient-linked bookings, the existing per-patient appointment-schedule mutex is acquired before locking `Appointment`, matching the patient self-service cancellation/rescheduling lock order.
- `Appointment` is then locked before `GuestAppointmentContact`, matching guest-token operations and Reception guest linking.
- Conditional updates protect against stale appointment state. PostgreSQL doctor, patient, and room constraints remain authoritative.
- Audit/history stores only the bounded reason code, timing classification, employee actor, appointment ID, and relevant appointment timestamps; no guest name, phone, email, management token, or medical content is copied.

## Explicit exclusions

No Reception appointment search/list UI, booking wizard, doctor/service transfer, appointment cancellation after check-in, no-show marking, queue/check-in/walk-in workflow, notification delivery, schema or migration, seed, dependency, environment, or package changes are included. The appointment ID is supplied by a future authorized Reception workspace; this increment does not add an appointment lookup API.
