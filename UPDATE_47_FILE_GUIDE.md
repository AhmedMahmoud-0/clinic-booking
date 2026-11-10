# Update 47 — File guide

## New files

1. `src/app/api/public/appointments/guest/cancel/route.ts` — same-origin public guest-cancellation Route Handler; token is accepted only in strict JSON body.
2. `src/server/appointments/guest-appointment-cancellation.ts` — SHA-256 token lookup, row locking, serializable cancellation, immutable lifecycle event, external audit record, and atomic token revocation.
3. `src/server/appointments/guest-appointment-cancellation-policy.ts` — pure unresolved-guest eligibility and inclusive 24-hour rule.
4. `src/server/appointments/guest-appointment-cancellation-validation.ts` — strict 32-byte base64url token request validation.
5. `tests/unit/guest-appointment-cancellation-policy.test.ts` — 10 policy tests.
6. `tests/unit/guest-appointment-cancellation-validation.test.ts` — 7 validation tests.
7. `tests/e2e/guest-appointment-cancellation.spec.ts` — 5 public route, origin, JSON, strict-input, and invalid-token boundary tests.
8. `docs/appointments/phase-6c3-guest-self-service-cancellation.md` — route contract, eligibility, transaction, audit, exclusions, and verification notes.

## Files to replace

1. `README.md` — records Phase 6C2 as locally verified and Update 47 as the current increment.
2. `docs/implementation-roadmap.md` — updates Phase 6C status and records the guest-token cancellation contract.

## Deliberately untouched

No Prisma schema, migration history, generated Prisma client, booking service, guest booking token issuance, Reception resolution service, patient cancellation/rescheduling service, role permissions, environment files, package manifest/lockfile, dependencies, or UI is replaced.
