# MERUNO Phase 6B2 — Public Guest Appointment Booking

## Status and intent

Update 41 adds public guest appointment creation without inventing a Patient identity. It reuses the Phase 6A availability calculation and the Phase 6B1 booking transaction pattern. A guest supplies a full name, phone number, optional email, doctor, service, and the exact UTC instant returned by the public availability endpoint.

A guest booking does **not** create a `Patient`, official MRN, `PatientContact`, `PatientAccount`, identity-verification record, or delegation grant. The appointment initially has `patientId = null` and a dedicated `GuestAppointmentContact` record. It uses the existing `PUBLIC_WEBSITE` booking source.

## Endpoint

`POST /api/public/appointments/guest`

Required JSON fields:

- `fullName`
- `phone`
- `doctorId`
- `serviceId`
- `startsAt` — exact canonical UTC instant returned by `GET /api/public/appointment-availability`

Optional field:

- `email` — an unverified contact address; blank is treated as omitted.

The request is same-origin and strict. Client-supplied `patientId`, MRN, status, source, price, room, or duration is rejected. No account or OTP is required.

## Identity and privacy boundary

- Guest details live in `GuestAppointmentContact`, not in `Patient` or `PatientContact`.
- The guest's name, phone, optional email, and one-time management-token hash are stored with the appointment.
- Egyptian Arabic/ASCII phone digits are normalized using the existing patient phone normalization rules. A normalized phone is for later search/reconciliation only; it is not proof of identity and does not auto-link a patient.
- The API returns booking confirmation details and the management token once. Only the SHA-256 token hash is stored. The token is a bearer secret for a future guest self-service flow; it is not an OTP and must not be logged, placed in a URL, or shared publicly.
- The public response does not return patient IDs, MRNs, guest contact fields, or medical details. All responses are `no-store`.
- The public guest request is not linked to an account, does not verify the phone/email, and does not send SMS, WhatsApp, or email in this increment.

## Atomic booking and availability

The guest service runs a Prisma `Serializable` transaction and reuses the existing Phase 6A calculator. It rechecks the selected public doctor, active consultation/follow-up service, exact offered time, current duration/price, schedule/exception state, existing doctor appointments, and available consultation room. The current duration, price, and currency are snapshotted on the appointment.

The appointment is created as `CONFIRMED`; its initial status-history event is `SYSTEM` because there is no verified Patient actor or staff actor. An `EXTERNAL` audit event records the booking without copying submitted name, phone, email, token, or medical data into the audit reason. The existing doctor and room exclusion constraints remain unchanged and protect concurrent booking writes.

A guest has no known verified Patient identity, so the existing patient-overlap exclusion cannot be evaluated for that person. It is intentionally not bypassed for patient-linked bookings. When Reception later links a guest appointment, PostgreSQL rechecks the patient-overlap constraint; a conflict prevents linking until the separately approved Reception overlap workflow is implemented.

## Database identity safeguards

Migration 9 makes `Appointment.patientId` optional and adds `GuestAppointmentContact` with explicit `PENDING_VERIFICATION` and `LINKED` states.

Deferred database triggers enforce:

1. An appointment without `patientId` must have exactly one unresolved guest contact.
2. A guest contact can be linked only when the appointment `patientId` and `resolvedPatientId` match, the resolving employee and timestamp are recorded, and a matching `VERIFIED` `IdentityVerification` exists for that appointment, patient, and employee.
3. A guest appointment cannot move into check-in, waiting, in-consultation, or completed states before it is linked to a Patient.
4. Queue and Encounter records tied to an appointment must use the same already-linked Patient. This prevents clinical workflow creation from a provisional guest contact.

Reception's future linking operation must create the identity verification and update `Appointment.patientId` plus `GuestAppointmentContact` resolution metadata in one transaction. It must use the existing two-distinct-identifier verification policy; phone number alone is insufficient.

## Deliberately not included

- No Reception booking or patient-overlap exception.
- No provisional Patient/MRN creation.
- No duplicate-patient auto-match or linking based on phone/name.
- No guest cancellation/rescheduling API yet; the one-time management token is persisted as a hash for the later Phase 6C guest self-service flow.
- No guest search/list UI, booking UI/stepper, reception UI, patient portal pages, check-in, queue, walk-in, email/SMS/WhatsApp delivery, or external rate-limit provider integration.
- No new dependencies or environment variables.

## Apply and verify

- Run `npm run db:validate` and `npm run db:generate` after applying the schema file.
- Check migration status; migration 9 should be the only pending migration if the previous eight are applied.
- Apply it with `npx prisma migrate deploy --config=./prisma7.config.ts`, then confirm the database is up to date.
- Run the standard five checks: typecheck, lint, unit tests, Playwright E2E, production build.

The application remains a synthetic portfolio demo, not production clinical software. Public anonymous endpoints will need deployment-level abuse/rate controls before any real-world use.
