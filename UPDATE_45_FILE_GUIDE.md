# Update 45 — File guide

## New files

1. `src/app/api/patient/appointments/[appointmentId]/cancel/route.ts` — verified Patient Portal cancellation endpoint.
2. `src/server/appointments/patient-appointment-cancellation.ts` — Serializable transaction, patient/delegate authorization, schedule mutex, conditional status update, and status history.
3. `src/server/appointments/patient-appointment-cancellation-policy.ts` — pure 24-hour/status eligibility rule.
4. `src/server/appointments/patient-appointment-cancellation-validation.ts` — strict empty request schema and path ID validation.
5. `tests/unit/patient-appointment-cancellation-policy.test.ts` — exact 24-hour boundary and appointment-state tests.
6. `tests/unit/patient-appointment-cancellation-validation.test.ts` — strict request and path validation tests.
7. `tests/e2e/patient-appointment-cancellation.spec.ts` — unauthenticated access and spoofed-actor/reason protection.
8. `docs/appointments/phase-6c1-patient-self-service-cancellation.md` — implementation contract and boundaries.

## Files to replace

1. `README.md` — mark Phase 6B3C complete and Phase 6C1 current.
2. `docs/implementation-roadmap.md` — record migration 10 verification and the Phase 6C1 scope/status.

## Deliberately untouched

No Prisma schema, migration, migration history, generated Prisma client, seed, package manifest/lockfile, environment file, existing appointment booking or guest-resolution implementation, UI, or existing test files are replaced.
