# Phase 6D3 — Reception Walk-in Registration (Update 52)

## Purpose

Add a controlled Reception operation for admitting an existing patient without a pre-booked appointment. A walk-in is represented by the existing `QueueEntry` model (`type = WALK_IN`); this increment does not fabricate an Appointment or expand the clinical record.

## Route and authorization

- `POST /api/reception/walk-ins`
- Requires the existing `appointment.manage` employee permission and same-origin validation.
- The service independently rechecks an active employee and active `RECEPTION` role assignment inside a Serializable transaction.
- Strict JSON input contains only `patientId`, `doctorId`, and `identity` with two distinct supported identity elements.
- The selected Patient must already exist and be active. If the walk-in has no Patient record, Reception must first use the existing patient-registration process. This endpoint does not create a Patient or MRN.

## Identity and privacy

- Reuse the Phase 5B identity matcher for two distinct supported fields (`FULL_NAME`, `DATE_OF_BIRTH`, `PHONE`, or `MRN`).
- Persist only identifier types, verification result, actor, timestamp, and fixed notes. Submitted values are neither stored nor written to audit events.
- Failed matching persists a `FAILED` IdentityVerification and a minimal audit event, but creates no queue ticket.
- Reception DTOs return only the queue ticket number/date/status, doctor display name, and the selected patient's MRN/ID. No contact details or clinical data are returned.

## Eligibility and scheduling

- The clinic and selected active doctor must both be open at the current exact Cairo-local instant under configured weekly hours or active `EXTRA_HOURS` exceptions. `BLOCKED` exceptions override weekly/extra hours. No configured hours means fail closed.
- Reject while the doctor has an ongoing blocking appointment or a ticket in `IN_SERVICE`.
- Reject if the same Patient has a current-day blocking appointment with the same doctor, or an active (`WAITING`, `CALLED`, `IN_SERVICE`) ticket with that doctor.
- Guest appointments remain subject to Phase 6B3B identity resolution; unresolved guests cannot become walk-ins through this endpoint.

## Queue allocation and appointment priority

- Reuse `allocateNextDoctorQueueNumber` in the same Serializable transaction as the insert. It locks the `DoctorProfile` row shared with appointment check-in and Call Next; never compute an unlocked `MAX(queueNumber) + 1`.
- Create only a `QueueEntry` with `type = WALK_IN`, `status = WAITING`, and no `appointmentId`.
- Call Next prioritizes waiting `APPOINTMENT` tickets over `WALK_IN` tickets. An unended `CONFIRMED` appointment for that Cairo-local day holds waiting walk-ins even before the booked patient checks in.
- If a walk-in was already `CALLED` and an appointment subsequently takes priority, atomically return that walk-in to `WAITING` and write a minimal audit event. A ticket in `IN_SERVICE` blocks another Call Next operation.
- No automatic no-show state, queue skip, or walk-in priority override is introduced.

## Not included

- New-patient creation inside the walk-in API (use the existing Reception patient-registration operation first).
- Appointment creation, service/room reservation, free-text walk-in notes, walk-in self-service, or guest-to-walk-in conversion.
- Queue UI, public queue display, notifications, realtime updates, no-show processing, doctor-side service start/completion, or medical record access.
- No Prisma schema, migration, seed, dependency, package, environment, or configuration changes.

All data must remain synthetic demo data. MERUNO is a portfolio project, not production clinical software.
