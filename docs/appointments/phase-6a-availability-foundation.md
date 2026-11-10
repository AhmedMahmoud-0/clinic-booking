# MERUNO Phase 6A — Public Appointment Availability Foundation

## Status and purpose

Update 39 begins Phase 6 with a read-only availability calculation. It exposes candidate appointment slots for one publicly bookable doctor, one active consultation/follow-up service offered by that doctor, and one Cairo-local calendar date.

This is not a booking operation. It does not reserve a slot, create a patient, create an appointment, create a queue entry, or write an audit record. The later booking transaction must recheck all eligibility and conflicts at commit time. Existing PostgreSQL exclusion constraints remain the final doctor/room concurrency guard; the patient-overlap exception requires a separate design decision before booking mutations are implemented.

## Approved booking experience and project-wide constraints

The public booking stepper is standardized to five visible steps, regardless of older boards that show four or seven internal actions:

1. Specialty.
2. Doctor.
3. Date and time.
4. Patient information and review (including visit type).
5. Confirmation.

Internally the flow still resolves the selected specialty, checks the doctor's active specialty assignment, reads the doctor's service offerings, selects a Cairo-local date and candidate slot, resolves a patient or approved guest/guardian/delegate identity, revalidates, then confirms. A successful booking is confirmed automatically. The stepper is not implemented in Update 39.

The project remains one Egyptian outpatient branch with eight doctors across seven approved specialties, a medium internal laboratory, and digital X-ray/ultrasound only. It is a synthetic-data portfolio/demo, not production clinical software. The visual direction remains MERUNO's teal/white light interface, Inter, and Arabic/English RTL/LTR. The design archive retains 57 source images: six newer detailed boards supplement the older module boards; older composite boards are historical references where they conflict with the requirements audit. Reception screens must not expose medical history/results/prescriptions, and public queue displays use ticket numbers rather than patient names. The design archive is not proof that any screen or workflow has been implemented.

## Existing foundations reused — no duplicate models

Phase 6A reuses the models and rules already implemented:

- `Specialty`, `DoctorProfile`, `DoctorSpecialty`, `ServiceCatalog`, and `DoctorService` for public doctor/service eligibility, service duration, and the current price.
- `ClinicWeeklySchedule` and `ClinicScheduleException` for clinic opening intervals, closures, and extra hours.
- `DoctorWeeklySchedule` and `DoctorScheduleException` for doctor shifts, leave/blocked time, and extra hours.
- `ConsultationRoom` for optional room-capacity checks when active rooms have been configured.
- `Appointment` for existing booked time ranges and statuses.
- `src/lib/clinic-time.ts` for the approved `Africa/Cairo` IANA time zone and clinic-local conversion.

No Prisma model, field, enum, migration, seed, dependency, environment variable, or database write is added in this step.

## Public endpoint

`GET /api/public/appointment-availability?doctorId=<doctor-profile-id>&serviceId=<service-catalog-id>&date=YYYY-MM-DD`

The query date is a Cairo-local calendar date, not the browser or server's local date. Invalid/impossible dates and missing parameters receive a minimal 400 response. A doctor must be active, public, bookable, have a public display name, have an active employee record, and be assigned to an active specialty. The requested service must be active, assigned to that doctor, and be of type `CONSULTATION` or `FOLLOW_UP`.

The response contains only the public doctor display name/title, public service name/type/duration/current price, the Cairo-local date/time-zone, and candidate start/end instants plus local display times. It does not return patient IDs, names, MRNs, employee IDs, appointment IDs, or appointment details. Responses are `no-store`.

## Slot calculation rules

1. Read only active weekly schedule rows whose inclusive effective dates cover the requested date.
2. Convert weekly minute-of-day values through the clinic-local time-zone helper. Never use the machine's local time zone.
3. Add the relevant `EXTRA_HOURS` exception windows to the regular interval set.
4. Subtract `BLOCKED` windows. A clinic closure wins even when a doctor has an extra-hours row.
5. Intersect clinic opening intervals with doctor availability. A doctor's extra hours outside clinic hours never create a public slot.
6. Use the selected `DoctorService.durationMinutes` as the slot length. The current schema has no independent appointment-start increment, so candidate starts advance by that service duration; do not invent a universal 15/30-minute increment.
7. Exclude elapsed slots and slots overlapping existing appointments in `CONFIRMED`, `CHECKED_IN`, `WAITING`, or `IN_CONSULTATION` status. Cancelled, completed, and no-show appointments do not occupy future slots.
8. If active consultation rooms exist, a candidate slot requires at least one room without an overlapping active appointment. The endpoint does not select or reserve a room. If no active room rows exist, the existing schema permits unassigned appointments and this read-only calculation does not invent room records.
9. An empty clinic/doctor schedule means no availability. No sample shifts or clinic hours are seeded. Absence of schedule data must not be interpreted as 24/7 availability.
10. The endpoint is advisory only. Two callers may see the same candidate before either books it; the future booking service must re-evaluate inside a transaction and rely on database constraints for concurrency.

## Cross-phase rules that must remain intact

### Existing `Appointment` and status-history contract

The existing `Appointment` model already requires `patientId`, `doctorId`, `doctorServiceId`, `source`, `startsAt`, `endsAt`, `durationMinutes`, and a price snapshot (`bookedPrice`/`currencyCode`); `consultationRoomId` remains optional. Do not replace it with a parallel booking model. Its source values are `PUBLIC_WEBSITE`, `PATIENT_PORTAL`, and `RECEPTION`. The initial confirmation uses the existing `CONFIRMED` status and status-history model with the correct actor/source.

Approved status meanings are `CONFIRMED`, `CHECKED_IN`, `WAITING`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`, and `NO_SHOW`. `COMPLETED`, `CANCELLED`, and `NO_SHOW` are terminal ordinary states; a correction must be explicitly authorized and audited. `AWAITING_RESULTS` belongs to post-visit results follow-up, not appointment status. Queue-entry status remains a separate workflow from appointment status.


### Existing appointment constraints

- Appointment duration and price are snapshots. A later edit to the doctor's current service duration/price must not rewrite an already confirmed appointment.
- Doctor overlaps are not allowed.
- Consultation-room overlaps are not allowed when a room is assigned.
- Existing `Appointment_patient_no_overlap` currently prevents every overlapping appointment for a patient. The approved business reference allows a narrowly authorized Reception override with reason and audit. Do not weaken or drop the constraint casually. Phase 6B must design a transaction-safe, audited exception that preserves doctor and room conflict protection.
- `[start, end)` interval semantics mean appointments that end exactly when the next begins are adjacent, not overlapping.

### Patient and guest booking gates for Phase 6B

The current `Appointment.patientId` relation is required. Public guest booking is approved without OTP but must capture a phone number and be verified by Reception on arrival. The existing Reception patient-registration service creates an actual active patient record after two distinct identity elements are verified; it must not be reused to silently create a verified patient from a public guest phone number. Phase 6B must introduce and document a safe provisional guest-booking identity path, or another explicitly approved linkage design, before implementing guest appointment writes. Linking a guest to an existing MRN must use authorized identity verification, never phone-only matching.

- A verified patient account may book for itself within its authorized scope.
- A verified legal guardian may book for a linked minor only under the active relationship/guardian rules and the `BOOK_APPOINTMENTS` scope.
- An adult may book for another adult only through the approved booking authority. Booking authority does not grant medical-record access.
- Family relationship alone never grants appointment or medical-record access.
- Adult delegation scope and guardian scope remain separate from identity linking.

### Reception, check-in, queue, and walk-ins

- Booking confirmation is automatic after a successful, conflict-free booking transaction.
- Do not create a queue entry merely because a future appointment is confirmed. Queue/check-in creation belongs to the arrival workflow.
- Each doctor has an independent queue. Walk-ins may be admitted only when operational capacity exists and must never displace confirmed appointments.
- Reception sees appointment/queue operational data, not medical details. The public queue view uses ticket numbers, never patient names.
- Any clinical urgency priority is assigned by an appropriately qualified clinician, not by Reception.
- Reception checks the patient's identity with two distinct approved elements at arrival; a phone number alone is not a patient identifier.
- The arrival target is 15 minutes before the booked time. If the patient is more than 10 minutes late, Reception decides whether the visit remains workable; do not auto-cancel.
- A confirmed appointment is not a queue entry. Check-in creates/updates the queue using the per-doctor queue and a unique ticket number. No queue screen may expose the patient's name publicly.

### Cancellation, rescheduling, lateness, and no-show

- Patients may self-cancel or reschedule at least 24 hours before the appointment. Inside that window, they contact Reception; there is no automatic cancellation.
- Late cancellation is recorded; the demo has no automatic fee or fine.
- The patient should arrive 15 minutes early. The grace period is 10 minutes. Passing the grace period does not automatically cancel the appointment; Reception decides whether attendance is still workable.
- No-show is recorded by Reception. It is not automatically assigned by a timer.
- Completed, Cancelled, and No-show are terminal ordinary states. A correction/exception must be explicit and audited; never silently reopen a terminal appointment.
- Doctor absence stops new booking in the affected period; impacted appointments are surfaced for Reception contact/rebooking. Do not switch to another doctor automatically without patient agreement.
- Booking confirmation/reminder may be delivered in-app and by email when a valid address exists; the approved reminder target is 24 hours before the appointment. Notifications about booking changes must not expose medical details. Paid SMS and WhatsApp integration are out of scope.
- When a selected doctor has no slot, the product may later suggest the nearest slot for that doctor, then another doctor in the same specialty, then Reception contact. There is no automated cancelled-slot waitlist.

## Explicitly out of scope for Update 39

- Booking creation or reservation/holding a slot.
- Patient or guest record creation/linking.
- Cancellation, rescheduling, check-in, waiting queue, walk-in registration, and no-show mutations.
- Reception or public booking UI.
- Clinic/doctor schedule administration UI (Phase 11).
- Any UI claiming Arabic/RTL/mobile coverage is complete; those variants remain a cross-cutting design/implementation requirement.
- Any online payment, OTP/SMS/WhatsApp provider, or external booking provider.

## Phase 6B design decisions required before writes

1. Choose and implement a non-verified guest booking identity path compatible with the required `Appointment.patientId` relation and the existing two-identifier patient registration policy.
2. Resolve the patient-overlap override at both service and PostgreSQL levels. The exception must require an authorized Reception actor, reason, and immutable audit evidence, while doctor and room overlap constraints remain unconditional.
3. Define the atomic booking transaction: re-read doctor/service eligibility, schedules/exceptions, patient authorization, doctor/patient/room conflicts, create appointment with duration/price snapshots, and append initial status history. The booking must fail closed on conflicts.
4. Define the booking-specific account/guardian/adult-delegate permission decisions without treating family relationship as authorization.
5. Define how the server selects an active consultation room when rooms are configured, and how an unassigned appointment is handled when the clinic has no active rooms configured.

## Verification

The update adds unit tests for interval merging/intersection/closure subtraction, duration-based slot generation, doctor conflicts, room availability, request validation, and Cairo-local instant conversion. E2E coverage checks validation, minimal errors, and no-store behavior for the public endpoint. No migration or Prisma client regeneration is required.
