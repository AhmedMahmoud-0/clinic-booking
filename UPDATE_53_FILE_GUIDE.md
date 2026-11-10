# MERUNO Update 53 — File Guide

## New files — add all 8

1. `src/server/appointments/reception-appointment-no-show-policy.ts`
   - Reception actor check, the inclusive 10-minute grace boundary, appointment/queue eligibility, and Patient/guest identity-state consistency.
2. `src/server/appointments/reception-appointment-no-show-validation.ts`
   - Opaque appointment ID validation and strict empty-object request contract; no client-selected status, reason, patient, or actor.
3. `src/server/appointments/reception-appointment-no-show.ts`
   - Serializable no-show service, appointment/guest-contact row locks, conditional status transition, guest-token invalidation for unresolved guest bookings, status history, and PII-minimal audit.
4. `src/app/api/reception/appointments/[appointmentId]/no-show/route.ts`
   - Protected `POST /api/reception/appointments/:appointmentId/no-show` endpoint.
5. `tests/unit/reception-appointment-no-show-policy.test.ts`
   - Actor, grace-period boundary, terminal/checked-in state, Patient/guest source-state, and overdue appointment policy tests.
6. `tests/unit/reception-appointment-no-show-validation.test.ts`
   - Strict empty-body and appointment-ID validation tests.
7. `tests/e2e/reception-appointment-no-show.spec.ts`
   - Endpoint authentication, no-store behavior, content-type, and client-claim rejection coverage.
8. `docs/appointments/phase-6d4-reception-no-show.md`
   - Scope, authorization, eligibility, lock order, history/audit, and exclusions.

## Existing files — replace only these 2

1. `README.md`
2. `docs/implementation-roadmap.md`

Do not replace any other files. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, package files, Prisma schema, all migrations, seeds, and existing source/tests.
