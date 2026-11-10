# MERUNO Phase 6B3B — Guest Appointment Identity Resolution

## Purpose

This increment lets an authorized Reception employee resolve an existing public guest appointment to one exact active Patient record. It does not convert a guest contact into a Patient or create a new MRN.

## API

`POST /api/reception/appointments/:appointmentId/resolve-guest`

The request body contains:

- `patientId`: an existing Patient record selected by Reception.
- `identity`: two distinct identifiers using the existing Phase 5B contract (`FULL_NAME`, `DATE_OF_BIRTH`, `PHONE`, or `MRN`).

Both identifiers are compared with the selected Patient's stored record. The public guest contact's name or phone, guest booking reference, and one-time management token are not identity evidence. Do not treat the person who made the booking as the patient automatically; for a child, link the appointment to the child's Patient record and use the existing guardian-verification/delegation workflow where it is separately required. This linking operation does not grant the booker access to the patient's medical record.

## Authorization and transaction

- The Route Handler requires `appointment.manage` and same-origin protection.
- The server service rechecks an active Employee with an active `RECEPTION` role assignment inside a PostgreSQL Serializable transaction.
- Only `PUBLIC_WEBSITE`, `CONFIRMED`, unresolved guest appointments with `patientId = null` are accepted.
- The selected Patient must exist and be active.
- A failed two-element match records a `FAILED` `IdentityVerification` and PII-minimal audit event; the appointment remains unresolved.
- A successful match is not persisted as `VERIFIED` until the appointment can be linked. The service first rechecks overlapping active appointments for the selected Patient.
- If an overlap exists, the system records a PII-minimal blocked-link audit event and leaves the guest appointment unresolved. A database exclusion conflict is also returned as HTTP 409. No overlap bypass is included.
- On success, one transaction writes the `VERIFIED` `IdentityVerification`, links `Appointment.patientId`, changes `GuestAppointmentContact` to `LINKED`, stores the exact Patient/resolving employee/timestamp, revokes the former guest-management token, and writes verification/link audit events. Migration 9's deferred database trigger checks the final cross-table state at commit.

## Data protection and boundaries

- Submitted identifier values are never persisted or placed in audit logs. Only identifier element types, result, actor, and time are retained.
- The endpoint never returns guest contact name, phone, email, or management-token hash.
- The previous guest management token is invalidated after linking.
- No Patient, MRN, PatientAccount, PatientAccessGrant, PatientRelationship, QueueEntry, or Encounter is created.
- Queue/check-in/clinical work remains blocked until a successful Patient link exists.
- The existing patient, doctor, and room overlap constraints are unchanged. The special patient-overlap exception remains a separate Phase 6B3C item.
- No schema change, migration, seed, package, or environment change is included.

## Verification

The new validation and policy tests cover valid/invalid states and strict input handling. Playwright verifies that anonymous callers cannot invoke the route or submit overlap/actor claims. Local totals expected after the unchanged Update 42 suite: 406 Vitest tests and 53 Playwright tests, plus typecheck, lint, and production build.

This remains a synthetic-data portfolio/demo workflow, not production clinical software.
