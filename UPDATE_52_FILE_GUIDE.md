# MERUNO Update 52 — File Guide

## New files — add all 8

1. `src/server/appointments/walk-in-registration-policy.ts`
   - Reception eligibility policy and scheduled-appointment priority decision for Call Next.
2. `src/server/appointments/walk-in-registration-validation.ts`
   - Strict existing-patient, doctor, and two-element identity request validation.
3. `src/server/appointments/walk-in-registration.ts`
   - Serializable existing-patient walk-in verification, schedule checks, shared queue allocation, queue insert, and audit events.
4. `src/app/api/reception/walk-ins/route.ts`
   - Protected `POST /api/reception/walk-ins` endpoint.
5. `tests/unit/walk-in-registration-policy.test.ts`
   - Walk-in eligibility and appointment-priority queue decisions.
6. `tests/unit/walk-in-registration-validation.test.ts`
   - Strict payload and two-identifier contract tests.
7. `tests/e2e/reception-walk-ins.spec.ts`
   - Authentication and client-claim rejection coverage for the Reception walk-in endpoint.
8. `docs/appointments/phase-6d3-walk-in-registration.md`
   - Scope, authorization, identity, schedule, queue priority, and exclusions.

## Existing files — replace only these 3

1. `src/server/appointments/reception-queue.ts`
   - Update Call Next to prioritize booked appointments, hold walk-ins while confirmed appointments remain in their scheduled window, defer a previously called walk-in if a booked appointment takes priority, and block concurrent calls while a ticket is `IN_SERVICE`.
2. `README.md`
3. `docs/implementation-roadmap.md`

Do not replace any other files. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, package files, Prisma schema, all migrations, seeds, and existing source/tests.
