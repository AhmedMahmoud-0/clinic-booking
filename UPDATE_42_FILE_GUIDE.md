# MERUNO Update 42 — File-by-file guide

## New files

| File | Purpose |
|---|---|
| `src/app/api/reception/appointments/route.ts` | Employee-permission-guarded Reception appointment creation endpoint. |
| `src/server/appointments/reception-appointment-booking-validation.ts` | Strict existing-patient booking input contract with canonical UTC instant validation. |
| `src/server/appointments/reception-appointment-booking-policy.ts` | Defense-in-depth active employee + active Reception assignment policy. |
| `tests/unit/reception-appointment-booking-validation.test.ts` | Eight request-contract tests, including rejection of forged identity and override fields. |
| `tests/unit/reception-appointment-booking-policy.test.ts` | Four Reception employee policy tests. |
| `tests/e2e/reception-appointment-booking.spec.ts` | Two unauthenticated access-boundary tests for the new route. |
| `docs/appointments/phase-6b3a-reception-booking.md` | Scope, API contract, invariants, exclusions, and next-phase gates. |

## Existing file replaced

| File | What changed |
|---|---|
| `src/server/appointments/appointment-booking.ts` | Reuses the existing serializable booking workflow for Reception; records source, employee creator/status-history actor, and PII-minimal audit event without relaxing patient/doctor/room conflict checks. |

## Documentation replaced

| File | What changed |
|---|---|
| `README.md` | Marks Update 41 complete and Phase 6B3A current. |
| `docs/implementation-roadmap.md` | Records Update 41 + Fix 01 verification, defines Phase 6B3A, and preserves the patient-overlap exception as Phase 6B3B. |

## Database and dependencies

No schema, migration, seed, Prisma client, package, or environment changes are included.
