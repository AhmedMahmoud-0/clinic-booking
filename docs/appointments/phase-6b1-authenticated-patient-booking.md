# MERUNO Phase 6B1 — Authenticated Patient Booking

## Status and purpose

Update 40 adds the first appointment-creation operation. It is intentionally limited to a verified patient-portal actor booking for themself or for a patient record covered by an active, exact `BOOK_APPOINTMENTS` grant. Guest booking and Reception booking are not implemented in this increment.

This boundary is deliberate. `Appointment.patientId` is required, and guest booking is allowed by the approved requirements without OTP. A phone number alone must not be converted into a verified patient identity or an official MRN. A provisional guest identity and the later Reception identity-resolution/linking workflow still require a separate design before guest booking writes can be added.

## Endpoint

`POST /api/patient/appointments`

The request must be same-origin JSON and must contain:

```json
{
  "patientId": "<patient-record-id>",
  "doctorId": "<doctor-profile-id>",
  "serviceId": "<service-catalog-id>",
  "startsAt": "<exact-UTC-instant-returned-by-availability>"
}
```

`startsAt` must be the exact canonical UTC timestamp returned by `GET /api/public/appointment-availability`. The browser must not submit a local time string, an arbitrary UTC offset, a price, duration, room, appointment status, or appointment source. Unknown fields are rejected.

The endpoint is protected by the existing verified patient-portal session guard. Its data service independently verifies booking authority inside the transaction:

- Self-booking: the authenticated patient record and target patient record must both be active and have the same ID.
- Booking for a minor: an active, non-expired, non-revoked grant must include `BOOK_APPOINTMENTS`; the directed family relationship must remain active and legally verified, with guardian verification evidence recorded by an employee.
- Booking for another adult: the active grant must include `BOOK_APPOINTMENTS`, and the adult subject patient must have explicitly approved the delegation.
- A family relationship alone, a `VIEW_PROFILE` grant, a pending grant, or a revoked/expired grant is not booking authority.
- Booking authority does not grant medical-record access. It is checked only for the booking operation.

## Atomic booking transaction

The service uses Prisma `Serializable` isolation and reuses the Phase 6A availability calculator through the transaction client:

1. Re-resolve the actor and target patient records and check the exact self/delegated booking authority.
2. Re-read the selected publicly bookable doctor and the active consultation/follow-up service offered by that doctor.
3. Recalculate that Cairo-local date's slots from clinic hours, doctor schedules, exceptions, service duration, existing blocking appointments, and configured consultation rooms. The submitted start must match one exact candidate slot.
4. Recheck whether the target patient already has an overlapping blocking appointment. The existing patient-overlap exclusion constraint remains unchanged and remains the database authority under concurrency.
5. If active consultation rooms are configured, select one that is free for the full interval. If no active rooms exist, preserve the schema's existing optional-room behavior and leave `consultationRoomId` null.
6. Create the appointment as `CONFIRMED`, snapshot the current doctor-service duration, price, and currency, and append its initial `PATIENT` status-history row in the same transaction. For delegated booking, the history actor is the authenticated grantee patient.

The transaction does not create a queue entry. A confirmed future appointment is not a check-in or waiting-queue record. PostgreSQL's existing doctor, patient, and room exclusion constraints remain in place; a concurrent conflict returns a safe 409 response.

## Response

The response returns only the appointment ID/reference, status, start/end instants, Cairo-local date/time, duration, booked-price/currency snapshot, and public doctor/service display information. It does not return patient names, MRNs, contact details, delegation details, or medical information. The response uses `Cache-Control: no-store` through the existing JSON helper.

## Deliberately excluded

- Guest booking and provisional guest identity creation/linking.
- Reception appointment creation and the approved same-patient overlap exception.
- Any change to the existing patient, doctor, or room exclusion constraints.
- Booking UI, public multi-step booking screens, patient portal appointment pages, or staff appointment screens.
- Queue entries, check-in, walk-ins, cancellation, rescheduling, no-show, notifications, or reminder delivery.
- New Prisma models, schema fields, migrations, seeds, dependencies, or environment variables.

## Remaining Phase 6B gates

### Guest identity

The existing `Appointment.patientId` relation is mandatory. The Reception registration service requires two distinct identity elements and must not be reused to create a verified patient from a guest phone number. Before guest booking is implemented, define a provisional identity that cannot access patient portal/medical data or masquerade as a verified MRN, and define the Reception arrival flow to verify two identifiers and either resolve the correct existing patient or safely convert/link the provisional record without duplicate medical identities.

### Reception overlap override

The requirements permit a narrowly authorized Reception override for overlapping appointments belonging to the same patient, with a bounded reason, an authorized actor, and immutable audit evidence. The existing `Appointment_patient_no_overlap` exclusion constraint currently rejects all such overlaps. Do not drop or weaken it casually. Design a transaction-safe database rule that permits only an explicitly recorded override while doctor and room overlap protection remain unconditional before adding Reception booking writes.

## Verification

Update 40 adds unit coverage for request validation, self/delegated booking authority, guardian and adult grant decisions, exact slot selection, plus an unauthenticated Route Handler E2E check. The developer must run the standard five local checks. Expected totals, assuming the current suite is unchanged, are 356 Vitest tests across 37 files and 46 Playwright E2E tests. No Prisma generation or migration is required.
