# MERUNO Phase 6B3A — Reception Booking for Existing Patients (Update 42)

## Purpose

Add the standard Reception appointment-creation path for an existing, active Patient record. This is separate from patient-portal booking (Update 40) and public guest booking (Update 41), while reusing their validated availability and serializable booking service.

## API contract

`POST /api/reception/appointments`

The route:

- Requires the existing `appointment.manage` employee permission through `withEmployeePermissionRoute`.
- Enforces same-origin JSON requests using the existing account-linking request utilities.
- Accepts only `patientId`, `doctorId`, `serviceId`, and the exact canonical UTC `startsAt` returned by the Phase 6A availability endpoint.
- Rejects unknown fields, including caller-supplied role, employee ID, or overlap-override fields.
- Returns a minimal appointment confirmation DTO with `Cache-Control: no-store`.

## Server-side enforcement

The service performs a second check inside a PostgreSQL Serializable transaction:

1. The employee must still be active and have an active `RECEPTION` role assignment.
2. The selected Patient must exist and be active.
3. The exact slot is recomputed against clinic hours, doctor schedules/exceptions, active service configuration, service duration, and current bookings using the existing Phase 6A availability service.
4. The exact Patient must have no blocking overlapping appointment.
5. An active consultation room must be selected when room records are configured.
6. The booked duration, price, and currency are snapshotted from the active DoctorService.
7. The appointment is created with source `RECEPTION`, its creator employee ID, status `CONFIRMED`, and an initial `STAFF` status-history event.
8. A PII-minimal `RECEPTION_APPOINTMENT_BOOKED` audit event is committed in the same transaction.

No QueueEntry is created at booking time.

## Deliberate exclusions

This increment does not:

- Create a Patient or guest contact.
- Link a guest contact to a Patient.
- Override patient appointment overlap.
- Weaken the doctor or consultation-room PostgreSQL exclusion constraints.
- Add booking, patient-search, or reception UI screens.
- Add migrations, Prisma model changes, seed data, environment variables, or dependencies.
- Implement cancellation, rescheduling, check-in, waiting queue, or walk-in workflows.

## Patient-overlap exception remains separate

The approved project policy permits a narrow Reception exception to same-patient appointment overlap when the employee has the required authority and records an approved reason. The current patient exclusion constraint remains unchanged in Update 42. Phase 6B3B must design and test the dedicated permission, allowed reason codes, immutable actor-attributed audit event, and database-enforced exception invariant before allowing any override. Doctor and room overlap constraints must remain unconditional.

## Verification

Update 42 adds eight validation tests, four Reception actor-policy tests, and two Playwright authorization-boundary tests. Expected suite totals from the verified Update 41 baseline are 390 unit tests and 51 Playwright tests, assuming no local tests were added or removed. TypeScript, ESLint, and production build must also pass.
