# Phase 6D4 — Reception No-show Recording (Update 53)

## Purpose

Provide an explicit, audited Reception action for recording that an appointment patient did not arrive. No-show is never set by a timer, background job, or automatic appointment expiry.

## Route and authorization

- `POST /api/reception/appointments/:appointmentId/no-show`
- Requires the existing `appointment.manage` employee permission and same-origin request validation.
- The service rechecks the employee's active status and active `RECEPTION` role assignment inside a Serializable transaction.
- The request body must be an empty JSON object. The caller cannot choose patient ID, appointment status, reason, actor, or timestamp.

## Eligibility

- The appointment start must be in the past by more than 10 full minutes. No artificial same-day restriction is added; the original appointment time remains auditable in its history.
- It must remain `CONFIRMED`, with no `checkedInAt`, `cancelledAt`, `completedAt`, or existing `QueueEntry`.
- The 10-minute grace period is inclusive. The action is allowed only when more than 10 full minutes have elapsed after `startsAt`.
- A normal Patient Portal/Reception appointment must retain its Patient link and must not have a guest contact.
- A public guest appointment may be marked no-show only when its `GuestAppointmentContact` state is consistent: pending verification with no Patient link, or linked to the exact Patient on the appointment.
- An appointment already checked in or represented in the queue cannot be marked no-show. Queue-entry lifecycle is handled separately.

## Transaction and audit

- Lock `Appointment`, then `GuestAppointmentContact` in the same order used by guest token operations, Reception guest identity resolution, and Reception check-in. Re-read all state after acquiring the locks.
- Conditionally transition `CONFIRMED` → `NO_SHOW`; do not write `cancelledAt` and do not create a queue ticket.
- Append `STAFF` `AppointmentStatusHistory` with the Reception employee actor and a fixed reason code describing the 10-minute grace rule.
- Write a PII-minimal `AuditLog` event (`RECEPTION_APPOINTMENT_MARKED_NO_SHOW`). Do not store patient/guest contact details or client-supplied narrative.
- If an unresolved public guest appointment is marked no-show, replace its management token hash with a hash for an unreachable random token in the same transaction. A linked guest token is already invalidated by the identity-link process.
- No fee, penalty, or automatic cancellation is applied.

## Not included

- No queue-ticket `LEFT`, `CANCELLED`, `IN_SERVICE`, or `COMPLETED` transition. Those are separate queue/Doctor workflow operations.
- No automatic no-show job, notification delivery, Reception appointment list/search UI, patient contact or clinical-data access, schema/migration, seed, dependency, package, or environment change.

All data remains synthetic. MERUNO is a portfolio/demo project, not production clinical software.
