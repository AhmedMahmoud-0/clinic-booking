# Phase 6C4 — Guest self-service rescheduling (Update 48)

## Goal

Allow a person who booked as a guest to move an unresolved public appointment with the same high-entropy bearer management token returned once by the original guest-booking response. No account, OTP, or Patient record is created.

## Route contract

`POST /api/public/appointments/guest/reschedule`

- Requires the same exact same-origin `Origin` validation used by public guest booking and cancellation.
- Requires `Content-Type: application/json` and a strict body containing only `managementToken` and `startsAt`.
- The management token must retain the generated 32-byte base64url representation (43 characters). It is accepted only in the request body, never in a path or query parameter.
- The replacement start must be an ISO datetime containing an explicit UTC offset.
- The token is SHA-256 hashed before database lookup. Raw tokens are never logged, audited, returned, or persisted.
- The response returns only the booking reference, confirmed status, previous/new start and end instants, and clinic-local date/time. It never echoes the management token or guest contact details.

## Eligibility and scheduling policy

- The token must resolve to a pending `GuestAppointmentContact` attached to the same confirmed `PUBLIC_WEBSITE` appointment.
- The appointment must remain unresolved (`patientId = null`, `resolutionStatus = PENDING_VERIFICATION`, `resolvedPatientId = null`). A linked guest appointment cannot use the guest token; Reception linking already revokes its stored token hash.
- Rescheduling is available only when the existing appointment start is at least 24 elapsed hours away, including the exact 24-hour boundary. Inside the final 24 hours, the appointment is unchanged and the guest is directed to Reception.
- The requested start must be a different future instant.
- The doctor, service, duration, booked price, currency, booking reference, patient-less guest identity, confirmation timestamp, and status remain unchanged. Only `startsAt`, `endsAt`, and the assigned consultation room may change. Doctor/service changes require Reception review.
- The existing service duration must still match the appointment's booked duration; a changed configured duration is rejected for Reception review. The price snapshot is not recalculated or overwritten.
- Reuse `getPublicAppointmentAvailability` inside the transaction for the existing doctor/service/local date, excluding only the appointment being moved. Validate the requested instant against a generated available slot and the booked duration.
- Re-select an active consultation room that has no conflicting blocking appointment. Doctor and room PostgreSQL exclusion constraints remain authoritative for concurrent writes.

## Transaction, history, and audit

- Hash lookup resolves the appointment/contact IDs; the service locks the Appointment row and then GuestAppointmentContact row, matching the lock order used by guest cancellation and Reception identity resolution.
- Re-read the token hash and appointment/contact state after both locks. The Serializable transaction and conditional update prevent stale or concurrent state from being overwritten.
- Reuse the stored token hash after a successful reschedule. The token remains the bearer capability for subsequent management of this unresolved guest appointment; successful cancellation or Reception linking revokes it. The raw token is not reissued or returned.
- `AppointmentStatusHistory` records `CONFIRMED` → `CONFIRMED` with `changeSource = SYSTEM` because the enum has no guest actor. The reason records old/new UTC instants but no guest PII or bearer token.
- A separate PII-minimal `AuditLog` event uses `actorType = EXTERNAL` and action `GUEST_APPOINTMENT_RESCHEDULED`. It stores no raw token, contact details, or client-controlled actor identity.
- Appointment update, history, and audit event commit atomically. Serialization/exclusion conflicts return a safe 409 response.

## Exclusions

No guest appointment search/list UI, guest account creation, token-expiry policy, rate-limit provider, paid SMS/WhatsApp/email delivery, Reception late-change workflow, Reception appointment UI, patient portal UI, notifications, schema/migration, seed, dependency, package, or environment change is included.

## Verification

Expected after applying Update 48: 495 unit tests across 55 files and 66 Playwright E2E tests, plus typecheck, lint, and production build. These are expected totals; run the local project checks before treating this increment as complete.

The application remains a synthetic portfolio demo, not production clinical software. Before real-world exposure, public bearer-token endpoints need deployment-level abuse controls and reviewed operational security configuration.
