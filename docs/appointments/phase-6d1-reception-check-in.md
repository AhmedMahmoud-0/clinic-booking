# Phase 6D1 — Reception Appointment Check-in and Queue Entry

## Purpose

Add the first Reception arrival workflow. An appointment is checked in only after two distinct supported patient identifiers match the exact linked Patient record. The same transaction creates the patient's ticket in the queue for the appointment's doctor.

This is an API/domain increment. It does not add a Reception page, appointment search/list endpoint, queue board, queue-calling controls, or walk-in registration.

## Route and authorization

`POST /api/reception/appointments/:appointmentId/check-in`

The Route Handler requires the existing `appointment.manage` permission and exact same-origin validation. The service independently rechecks that the acting Employee is active and has an active `RECEPTION` role assignment inside the Serializable transaction.

The strict JSON body accepts only:

- `identity.firstIdentifier` and `identity.secondIdentifier`, using the existing Phase 5B identity verification schema.
- Optional `lateArrivalAccepted`, which must be `true` only when Reception has decided to accommodate an arrival after the grace period.

The client cannot choose the Patient, doctor, queue number/date, appointment status, actor, or arbitrary notes.

## Patient identity and guest boundary

Both distinct identifiers must match the same existing active Patient. Supported elements are `FULL_NAME`, `DATE_OF_BIRTH`, `PHONE`, and `MRN`, matching only data already stored on the Patient record.

The system stores the two element types, the verification result, the employee, appointment, and timestamp. Submitted identifier values are neither stored nor copied to audit/history records.

A public guest appointment can be checked in only after Reception has completed the existing two-identifier identity-resolution workflow and the `GuestAppointmentContact.resolvedPatientId` matches `Appointment.patientId`. An unresolved guest appointment has no Patient identity and cannot produce a QueueEntry. Patient Portal and Reception appointments must not have a guest contact record.

On mismatch, the transaction commits a `FAILED` `IdentityVerification` and a PII-minimal audit event. It creates no QueueEntry and leaves Appointment status unchanged. A successful comparison creates a `VERIFIED` IdentityVerification tied to the appointment.

## Arrival-time policy

- Check-in is limited to the appointment's current Cairo-local calendar date.
- The 15-minute early-arrival target is informational, not a hard block on earlier same-day arrival.
- The 10-minute grace period is inclusive. At exactly 10 minutes after the appointment start, the patient remains within the grace period.
- After the grace period, check-in requires an explicit Reception decision (`lateArrivalAccepted: true`).
- This operation never automatically cancels a late appointment and never changes it to `NO_SHOW`.
- Check-in does not occur on a different clinic-local date. A past appointment remains unchanged for separate staff review.

## Atomic lifecycle and queue allocation

Inside a Serializable transaction, the service:

1. Rechecks the active Reception employee and role.
2. Locks `Appointment`, then its optional `GuestAppointmentContact`, and rereads the appointment and patient-link state.
3. Rechecks eligibility, current Cairo-local date, late-arrival decision, and active Patient identity.
4. Records the identity verification result and PII-minimal identity audit event.
5. Allocates the next queue number for the doctor and Cairo-local date by locking the `DoctorProfile` row and reading the current maximum queue number.
6. Conditionally changes Appointment from `CONFIRMED` to `CHECKED_IN` and sets `checkedInAt`.
7. Creates exactly one `QueueEntry` of type `APPOINTMENT` and status `WAITING`.
8. Adds `AppointmentStatusHistory` (`STAFF`, `CONFIRMED` → `CHECKED_IN`) and a PII-minimal audit event.

The unique appointment-to-QueueEntry relation and doctor/date/queue-number unique constraint remain in force. The locked DoctorProfile row is the shared queue-number mutex. Every future QueueEntry creator—including Walk-in registration—must use `allocateNextDoctorQueueNumber` inside the same transaction as its insert; an unlocked `MAX + 1` is not safe.

The API returns queue ticket metadata and appointment/queue statuses only. It does not return Patient contact or medical information.

## Not included

- Queue calling, next-patient selection, reordering, pausing, completion, leaving, or cancellation.
- Walk-in registration.
- No-show marking or automatic cancellation.
- Appointment/Patient search or Reception UI.
- Public queue display or public patient names.
- Doctor workspace, encounter creation, or clinical access.
- Notifications, schema/migration, seed, dependency, package, or environment changes.

All project data remains synthetic demo data. This portfolio application is not production clinical software.
