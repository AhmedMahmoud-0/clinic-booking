# MERUNO Update 40 — File-by-file guide

## New server files

| File | Purpose |
| --- | --- |
| `src/server/appointments/appointment-booking-errors.ts` | Typed domain errors and HTTP status codes for booking failures. |
| `src/server/appointments/appointment-booking-validation.ts` | Strict request schema; the selected start must be the exact canonical UTC instant returned by availability. |
| `src/server/appointments/appointment-booking-policy.ts` | Pure self/delegated booking authority policy and exact advertised-slot selection. |
| `src/server/appointments/appointment-booking.ts` | Serializable booking transaction, active grant verification, availability recheck, patient/room conflict checks, booking snapshots, and initial status history. |

## New API route

| File | Purpose |
| --- | --- |
| `src/app/api/patient/appointments/route.ts` | Same-origin `POST /api/patient/appointments`, protected by the verified patient-portal guard. Guest and Reception booking are not included. |

## Existing server file replaced

| File | What changed |
| --- | --- |
| `src/server/appointments/appointment-availability.ts` | Accepts an optional Prisma transaction client so booking can reuse exactly the same availability calculation inside its Serializable transaction. Existing read-only endpoint behavior is unchanged. |

## Tests

| File | Coverage |
| --- | --- |
| `tests/unit/appointment-booking-validation.test.ts` | 8 validation tests for identifiers, strict fields, and canonical UTC slot timestamps. |
| `tests/unit/appointment-booking-policy.test.ts` | 16 tests for self-booking, active patient checks, guardian/adult grant rules, expiry/revocation/scope, and exact slot matching. |
| `tests/e2e/patient-appointment-booking.spec.ts` | Anonymous booking request is rejected by the patient-portal session guard with a no-store response. |

## Documentation replaced/added

- `README.md`: marks Phase 6A complete and Phase 6B1 current.
- `docs/implementation-roadmap.md`: records Update 39 verification, the 6B1 implementation, and remaining guest/Reception design gates.
- `docs/appointments/phase-6b1-authenticated-patient-booking.md`: detailed booking contract, transaction, authorization, exclusions, and remaining requirements.

## Database and dependencies

- No Prisma model, enum, field, index, migration, or seed changes.
- No generated Prisma Client change.
- No package or environment changes.
- Existing doctor/patient/room exclusion constraints remain untouched.
