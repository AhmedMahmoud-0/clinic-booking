# Phase 6C1 — Patient self-service cancellation (Update 45)

## Goal

Allow an authenticated patient to cancel one of their own confirmed, Patient-linked appointments only when the appointment starts at least 24 hours in the future. A valid delegated actor may cancel only with the exact active `MANAGE_APPOINTMENTS` scope.

This is a server/data-layer increment. It does not add booking or portal UI.

## Route contract

`POST /api/patient/appointments/:appointmentId/cancel`

- Requires a verified patient-portal session and exact same-origin request.
- Requires `Content-Type: application/json` with an empty JSON object (`{}`).
- The route path supplies only the appointment ID. The actor, patient, status, cancellation reason, and timestamp are resolved or chosen server-side.
- The API returns `Cache-Control: no-store` and a minimal cancellation DTO.

## Authorization

- The appointment must already be linked to a Patient record. An unresolved guest appointment is not exposed through this endpoint.
- The authenticated Patient may cancel their own appointment.
- A delegate must have an active, verified grant with the exact `MANAGE_APPOINTMENTS` scope. `BOOK_APPOINTMENTS` does not authorize cancellation.
- For delegated cancellation, the service rechecks the active subject/grantee records, active relationship, staff verification, legal-guardian evidence for a minor or subject-patient approval for an adult, expiry, and revocation inside the transaction.
- No client-supplied patient ID or actor ID can change the target record or actor.

## Cancellation policy

- Only `CONFIRMED` appointments can be self-cancelled.
- Cancellation is allowed at the exact 24-hour boundary and earlier: `startsAt - now >= 86,400,000 ms`.
- The rule compares UTC instants and is independent of server timezone or Cairo daylight-saving changes.
- At less than 24 hours, the appointment is unchanged; the response directs the patient to contact Reception to review the request.
- There is no automatic cancellation, late fee, or automatic no-show transition.
- Cancelled, checked-in, waiting, in-consultation, completed, and no-show appointments cannot be cancelled again through this endpoint.

## Transaction and history

The service acquires the per-Patient appointment-schedule mutex used by booking, re-reads the appointment, rechecks authority, validates the time window, and conditionally updates only a still-confirmed row in one Serializable transaction. It then inserts one status-history event:

- `fromStatus = CONFIRMED`
- `toStatus = CANCELLED`
- `changeSource = PATIENT`
- `changedByPatientId = authenticated Patient actor`
- `reason = PATIENT_REQUESTED_CANCELLATION`

The same fixed reason is stored in `Appointment.cancellationReason`. No free-text reason is accepted or stored. The existing immutable appointment history row is the patient-attributed lifecycle record; this increment does not add `PATIENT` to the broader AuditLog actor enum.

## Exclusions

No guest-token cancellation, patient rescheduling, employee/reception late cancellation, appointment search/list, UI, notification delivery, queue/check-in, schema change, migration, seed, dependency, package, or environment change.

## Verification expectations

The expected test totals are 440 unit tests across 49 files and 55 Playwright E2E tests, plus typecheck, lint, and production build. These are expected totals, not results claimed by this patch.
