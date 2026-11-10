# Update 46 — File guide

## New files

1. `src/app/api/patient/appointments/[appointmentId]/reschedule/route.ts` — verified Patient Portal rescheduling endpoint.
2. `src/server/appointments/patient-appointment-rescheduling.ts` — serializable rescheduling transaction, exact `MANAGE_APPOINTMENTS` delegation check, availability/overlap/room revalidation, conditional update, and patient history event.
3. `src/server/appointments/patient-appointment-rescheduling-policy.ts` — pure eligibility and 24-hour boundary policy.
4. `src/server/appointments/patient-appointment-rescheduling-validation.ts` — strict request and route-ID validation; only a new timestamp is accepted.
5. `tests/unit/patient-appointment-rescheduling-policy.test.ts` — 12 policy tests.
6. `tests/unit/patient-appointment-rescheduling-validation.test.ts` — 6 validation tests.
7. `tests/e2e/patient-appointment-rescheduling.spec.ts` — 2 authenticated-session and actor/field-spoofing boundary tests.
8. `docs/appointments/phase-6c2-patient-self-service-rescheduling.md` — implementation contract, limits, and API request shape.

## Files to replace

1. `src/server/appointments/appointment-availability.ts` — adds a server-only exclusion option for the appointment currently being moved; no public query schema change.
2. `README.md` — closes Phase 6C1 and records Update 46 as current.
3. `docs/implementation-roadmap.md` — records Phase 6C1 verification and Phase 6C2 implementation scope.

## Deliberately untouched

No Prisma schema, migration history, generated Prisma client, seed, package manifest/lockfile, environment file, existing cancellation service/route, booking service, role permission matrix, or UI is replaced.
