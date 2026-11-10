# Phase 6C2 — Patient self-service rescheduling

## Scope

This increment adds a protected patient-portal API to move an existing, Patient-linked, confirmed appointment to a newly available time.

- The existing appointment must be at least 24 hours away at the time of the request.
- A replacement slot must be in the future and must be returned by the existing clinic-local availability calculation.
- The patient or delegate must have exact `MANAGE_APPOINTMENTS` authority. `BOOK_APPOINTMENTS` alone is insufficient.
- Guest appointments without a Patient link are excluded.
- Only the time/date may change. The existing doctor, service, duration, booked price, currency, booking reference, and confirmation time remain unchanged. A doctor/service/duration change is handled by Reception.
- Only `CONFIRMED` appointments are eligible. Checked-in, waiting, in-consultation, completed, no-show, and cancelled appointments are rejected.

## Transaction and concurrency

- Run in a Serializable transaction.
- Acquire the existing per-patient appointment schedule write mutex before re-reading the appointment.
- Call the established availability calculation using the same doctor and service, excluding only the appointment currently being moved from doctor and room busy intervals.
- Recheck same-patient overlap against every other blocking appointment. Patient self-service cannot use the Reception overlap exception.
- Select an active consultation room with no other blocking appointment conflict.
- Apply a conditional appointment update using the previously read patient, state, old start, and old end values.
- PostgreSQL doctor, room, and patient overlap enforcement remains authoritative. Conflicts are returned as HTTP 409; no override or direct SQL bypass is added.

## History

A successful reschedule keeps the appointment status `CONFIRMED` and adds an `AppointmentStatusHistory` event with `fromStatus = toStatus = CONFIRMED`, `changeSource = PATIENT`, the authenticated patient actor, the event time, and a reason containing the previous and replacement UTC start instants. No client-supplied actor or reason is accepted.

## API

`POST /api/patient/appointments/:appointmentId/reschedule`

Request body:

```json
{ "startsAt": "2026-11-12T09:30:00.000Z" }
```

The API accepts only `startsAt`. Patient identity, doctor, service, room, duration, price, status, source, and actor are loaded or derived on the server.

## Deliberate exclusions

No guest bearer-token rescheduling, change of doctor/service, Reception late-change workflow, check-in, queue, walk-in, UI, schema changes, migrations, seed changes, package changes, or dependency changes are included.
