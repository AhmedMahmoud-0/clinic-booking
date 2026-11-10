# Phase 6B3C — Audited same-patient appointment-overlap exception

**Update:** 44  
**Implementation status:** Implemented in the patch; migration 10 and local verification remain pending.  
**Project context:** Synthetic-data portfolio/demo application only. This is not production clinical software.

## Purpose and boundaries

The normal booking rule continues to reject overlapping appointments for the same Patient. This increment adds one tightly scoped exception for Reception only, with an explicit operational reason and durable database evidence. It does not create a general override capability.

The exception is available only in these two server workflows:

1. `POST /api/reception/appointments` — Reception creates an appointment for an existing active Patient.
2. `POST /api/reception/appointments/:appointmentId/resolve-guest` — Reception links an unresolved public guest appointment to an existing active Patient after the Phase 5B two-distinct-identifier identity check.

Patient-portal booking and public guest booking cannot request or use the exception. Guest phone, email, guest name, booking reference, and guest-management token are not identity proof. The guest-link operation still requires two distinct identifiers that both match the selected Patient record.

## Authorization and reason codes

The new `appointment.patient-overlap.override` capability is assigned to the `RECEPTION` role only. The route still requires the existing `appointment.manage` permission. The domain service independently checks the current Employee status and active Reception role assignment in the same Serializable transaction. The database independently checks that the recorded approver is an active Employee with an active `RECEPTION` role assignment.

Only these reason codes are accepted:

- `CLINIC_DIRECTED_RESCHEDULE`
- `CLINICIAN_REQUESTED_FOLLOW_UP`
- `PATIENT_REQUESTED_EXCEPTION`
- `SAME_DAY_SERVICE_COORDINATION`

Free-text reasons and medical notes are deliberately excluded. The request cannot supply an approver ID or a boolean such as `allowPatientOverlap`; unknown keys are rejected by strict Zod schemas. Providing a reason when there is no actual overlap is rejected. A real overlap without the dedicated Reception permission is rejected.

## Database enforcement

Migration 10 adds the `PatientAppointmentOverlapReason` enum, `Patient.appointmentScheduleVersion`, and `AppointmentPatientOverlapException`.

Each immutable exception row records:

- the appointment being created or linked and the exact conflicting appointment;
- the same Patient ID;
- the exact start/end snapshots for both appointments;
- the authorized Reception employee;
- the bounded reason code;
- the PostgreSQL transaction ID and transaction timestamp.

The exception table rejects row updates/deletes and `TRUNCATE`. Foreign keys restrict deletion of the referenced Patient, Employee, and appointments. Prisma relation/index names are explicitly mapped to the migration's constraint names.

The existing `Appointment_patient_no_overlap` exclusion is replaced by a deferred PostgreSQL constraint trigger that checks the appointment's final state at transaction commit. For every currently overlapping blocking appointment pair, a matching exception row must exist for that exact subject/conflict direction, exact patient, exact interval snapshots, and current transaction. One exception row does not authorize a later or unrelated overlap. Stale interval snapshots cannot authorize a rescheduled interval.

A trigger increments a per-Patient schedule version before appointment schedule writes. The update is a per-patient write mutex, and patient reassignment locks both affected Patient rows in deterministic order. The application also locks the active Patient row before reading existing conflicts. These measures serialize competing same-patient scheduling writes before the conflict decision.

Only the patient-overlap exclusion is replaced. The pre-existing doctor and consultation-room exclusion constraints remain unchanged and unconditional.

## Transaction behavior

For Reception booking, the service revalidates the slot, active Patient, doctor/service, duration/price snapshot, and room. If there is a conflict and the dedicated permission and reason are valid, it creates the appointment, one immutable database exception row per conflicting appointment, and minimal audit events in the same Serializable transaction.

For guest resolution, the service first verifies two distinct Patient identity elements. It then locks the Patient and checks every current overlap. With no reason, a conflict leaves the guest appointment unresolved. With the dedicated permission and reason, the verified identity record, Patient link, guest-link state, guest-token revocation, exception rows, and audit events are committed atomically. No Patient/MRN/account/delegation/queue/encounter is created by this operation.

The database exception rows are the authoritative pair-specific evidence. The associated `AuditLog` entry is a concise operational summary and contains no submitted identity values or medical notes.

## Files and migration

- Migration: `20261109070000_audited_patient_overlap_exception` (migration 10).
- Schema: `prisma/schema.prisma`.
- Booking/link service: `src/server/appointments/appointment-booking.ts`.
- Validation and policy: `src/server/appointments/patient-overlap-exception-validation.ts`, `patient-overlap-exception-policy.ts`, and the existing Reception/guest request schemas.
- Permission matrix: `src/server/auth/authorization/types.ts` and `policy.ts`.
- Automated coverage: three new unit-test files; existing Reception booking and guest-resolution E2E checks include unauthenticated override-spoofing attempts.

No package, lockfile, environment, seed, or prior migration changes are included. No UI is added. The Reception workspace must later provide the internal appointment ID and a bounded reason selector without exposing a guest-management secret.

## Local verification required

After applying the patch, validate and generate the Prisma Client, confirm the database has exactly migrations 1–9 applied and migration 10 pending, apply migration 10 with `prisma migrate deploy`, and verify the database is up to date. Then run `typecheck`, `lint`, unit tests, E2E tests, and production build. The patch's expected unit-test total is 425 across 47 files; the E2E total is expected to remain 53. These are expected totals, not results claimed by this document.
