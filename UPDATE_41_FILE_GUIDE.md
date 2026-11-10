# MERUNO Update 41 — File-by-file guide

## New database migration

| File | Purpose |
| --- | --- |
| `prisma/migrations/20261108060000_guest_appointment_identity/migration.sql` | Creates provisional guest contact storage, relaxes `Appointment.patientId` nullability, and enforces guest identity resolution with deferred PostgreSQL triggers. |

## Prisma schema replaced

| File | What changed |
| --- | --- |
| `prisma/schema.prisma` | Adds `GuestAppointmentContact` and its resolution status; changes `Appointment.patientId` and `patient` relation to optional; adds the guest-contact one-to-one relation and resolver relations. |

## Server files added

| File | Purpose |
| --- | --- |
| `src/server/appointments/guest-appointment-booking-validation.ts` | Strict public guest input contract; allows optional email but rejects patient/MRN/price/source/status inputs. |
| `src/server/appointments/guest-appointment-identity-policy.ts` | Pure policy for unresolved guest, normal patient, and verified linked-guest identity states. |
| `src/app/api/public/appointments/guest/route.ts` | Same-origin public guest booking Route Handler. |

## Server file replaced

| File | What changed |
| --- | --- |
| `src/server/appointments/appointment-booking.ts` | Shares the slot/room transaction logic between authenticated patient bookings and public guest bookings; records guest contact without creating a Patient; hashes the one-time management token; records a PII-minimal external audit event. |

## Tests added

| File | Coverage |
| --- | --- |
| `tests/unit/guest-appointment-booking-validation.test.ts` | Guest name, Egyptian phone digits, optional email, canonical slot instant, and rejection of client patient identifiers/booking authority. |
| `tests/unit/guest-appointment-identity-policy.test.ts` | Pending guest state, normal Patient state, matching verified link, and invalid/mismatched resolution states. |
| `tests/unit/guest-appointment-migration.test.ts` | Migration contract, resolution constraints, verification evidence, queue/encounter guard, and preservation of current overlap constraints. |
| `tests/e2e/guest-appointment-booking.spec.ts` | Same-origin enforcement, anonymous public request validation, and rejection of client-supplied Patient identity. |

## Documentation replaced/added

- `APPLY_UPDATE_41.md` — application and verification instructions.
- `UPDATE_41_FILE_GUIDE.md` — this file.
- `docs/appointments/phase-6b2-guest-appointment-booking.md` — feature and identity design.
- `README.md` — marks Update 40 verified and Phase 6B2 current.
- `docs/implementation-roadmap.md` — updates Phase 6B2 and creates a separate 6B3 gate for Reception overlap override.
