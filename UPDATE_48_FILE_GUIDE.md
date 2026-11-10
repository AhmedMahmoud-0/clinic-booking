# Update 48 — File guide

## New files

1. `src/app/api/public/appointments/guest/reschedule/route.ts` — same-origin, strict JSON public guest rescheduling endpoint.
2. `src/server/appointments/guest-appointment-rescheduling.ts` — Serializable bearer-token management, row locks, slot/room revalidation, conditional update, history and external audit event.
3. `src/server/appointments/guest-appointment-rescheduling-policy.ts` — pure guest eligibility, future-slot and inclusive 24-hour policy.
4. `src/server/appointments/guest-appointment-rescheduling-validation.ts` — strict validation for the 43-character base64url token and offset-aware timestamp.
5. `tests/unit/guest-appointment-rescheduling-policy.test.ts` — 13 policy tests.
6. `tests/unit/guest-appointment-rescheduling-validation.test.ts` — 7 request-validation tests.
7. `tests/e2e/guest-appointment-rescheduling.spec.ts` — 4 same-origin, JSON-contract, validation, and unknown-token boundary tests.
8. `docs/appointments/phase-6c4-guest-self-service-rescheduling.md` — route, policy, transaction, audit and exclusion contract.

## Files to replace

1. `README.md` — marks Phase 6C3 complete and records Update 48 as the current increment.
2. `docs/implementation-roadmap.md` — closes Phase 6C3 based on the developer's reported local results and records Phase 6C4.

## Deliberately untouched

No Prisma schema, migration history, generated Prisma client, seed, package manifest/lockfile, environment file, existing guest cancellation/resolution service, appointment booking service, permission matrix, or UI is replaced.
