# MERUNO Update 39 — File-by-file guide

## New route

| File | Purpose |
| --- | --- |
| `src/app/api/public/appointment-availability/route.ts` | Public GET endpoint with strict query validation and minimal no-store responses. |

## New server files

| File | Purpose |
| --- | --- |
| `src/server/appointments/availability-errors.ts` | Stable domain error type and HTTP status for expected availability failures. |
| `src/server/appointments/availability-validation.ts` | Strict validation for doctor profile ID, service catalog ID, and real local calendar date. |
| `src/server/appointments/availability-policy.ts` | Pure interval merge, intersection, block subtraction, conflict checks, room availability, and duration-based slot generation. |
| `src/server/appointments/appointment-availability.ts` | Read-only Prisma queries and orchestration over existing schedules, exceptions, appointments, services, and configured consultation rooms. |

## Existing file replaced

| File | What changed |
| --- | --- |
| `src/lib/clinic-time.ts` | Adds conversion from `Africa/Cairo` local date/minute to an instant; retains the existing instant-to-local conversion. |

## Tests

| File | Coverage |
| --- | --- |
| `tests/unit/appointment-availability-policy.test.ts` | Eight tests for intervals, closures, schedule intersections, duration-based slots, doctor conflicts, room capacity, and elapsed slots. |
| `tests/unit/appointment-availability-validation.test.ts` | Four tests for valid requests, required identifiers, impossible dates, and rejecting extra fields. |
| `tests/unit/clinic-time.test.ts` | Extends the existing three clinic-time tests with five local-to-instant conversion checks, including Cairo daylight-saving midnight handling. |
| `tests/e2e/appointment-availability.spec.ts` | Three public API tests for missing parameters, impossible dates, and non-bookable doctor privacy. |

## Documentation replaced/added

- `README.md` — records Update 38 as complete and Update 39 Phase 6A as the current increment.
- `docs/implementation-roadmap.md` — records the verified Phase 5E closure, Phase 6A, and the Phase 6B guest/patient-overlap design gates.
- `docs/appointments/phase-6a-availability-foundation.md` — records reused foundations, endpoint rules, cross-phase policies, explicit exclusions, and unresolved Phase 6B design decisions.
- `APPLY_UPDATE_39.md` — apply/replace instructions and test commands.

## Deliberately not changed

- `prisma/schema.prisma` and `prisma/migrations`.
- Package manifests, dependencies, environment variables, generated Prisma client, or local database.
- Existing appointment records, patient records, schedules, clinic hours, rooms, or role permissions.
- Booking creation, guest registration, cancellation/rescheduling, check-in, queue, or UI.
