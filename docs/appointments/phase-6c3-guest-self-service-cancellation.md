# Phase 6C3 — Guest self-service cancellation (Update 47)

## Goal

Allow a person who booked as a guest to cancel the unresolved public appointment using the high-entropy bearer management token returned once by the original guest-booking response. No account, phone OTP, or Patient record is created.

## Route contract

`POST /api/public/appointments/guest/cancel`

- Requires the exact same-origin `Origin` check used by the public guest-booking route.
- Requires `Content-Type: application/json` and a strict body containing only `managementToken`.
- The token must retain its generated 32-byte base64url representation (43 characters). The route never accepts it in a URL or query string.
- The token is SHA-256 hashed before database lookup. Raw token values are never logged, audited, returned, or persisted.
- Responses are `no-store` and return only a booking reference, the new status, and cancellation instant.

## Eligibility and policy

- The token must resolve to a pending `GuestAppointmentContact` with the same confirmed `PUBLIC_WEBSITE` appointment.
- The appointment must remain unresolved (`patientId = null`, `resolutionStatus = PENDING_VERIFICATION`, `resolvedPatientId = null`).
- Cancellation is available only when the start instant is at least 24 hours away, including the exact 24-hour boundary. The comparison uses UTC elapsed milliseconds, not local calendar days.
- Inside the 24-hour window, the appointment is unchanged and the response directs the guest to contact Reception. No automatic cancellation or no-show transition occurs.
- A linked guest appointment cannot use the token. Reception's successful identity-resolution flow already replaces the stored hash with an unreachable random hash.
- A successful cancellation invalidates the token the same way, so it cannot be replayed.

## Transaction, history, and audit

- Hash lookup resolves the appointment ID; the service locks the Appointment row and then GuestAppointmentContact row in that order, then re-reads the token and state.
- The service runs in a PostgreSQL Serializable transaction. Conditional updates require the appointment to remain a confirmed unresolved public guest appointment and the contact to remain pending with the same token hash.
- The appointment transitions from `CONFIRMED` to `CANCELLED`, receives a fixed `GUEST_REQUESTED_CANCELLATION` reason, and gets a cancellation timestamp.
- `AppointmentStatusHistory` records `SYSTEM` as the lifecycle source because its enum has no guest actor; its reason identifies the guest-token cancellation. A separate `AuditLog` event uses `actorType = EXTERNAL`. No guest contact fields or bearer token are stored in either record.
- The guest token hash is rotated to a hash of an unreachable random token in the same transaction. If any update or audit write fails, all changes roll back.
- A serialization conflict returns a safe 409 state-changed response.

## Exclusions

No guest rescheduling, guest appointment lookup/list UI, Reception cancellation/rescheduling, patient portal UI, email/SMS/WhatsApp delivery, token-expiry policy, rate-limit provider, schema/migration, seed, dependency, package, or environment change is included. The existing one-time token issuance and SHA-256 storage contract is reused.

## Verification

Expected after applying Update 47: 475 unit tests across 53 files and 62 Playwright E2E tests, plus typecheck, lint, and production build. These are expected totals; run the local project checks before treating this increment as complete.

The application remains a synthetic portfolio demo, not production clinical software. Before any real-world exposure, public bearer-token endpoints need deployment-level abuse controls and a reviewed operational security configuration.
