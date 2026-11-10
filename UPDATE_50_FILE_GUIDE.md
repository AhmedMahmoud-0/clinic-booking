# Update 50 file guide

## New files — add all nine

| File | Purpose |
|---|---|
| `src/app/api/reception/appointments/[appointmentId]/check-in/route.ts` | Permission-guarded Reception check-in Route Handler with same-origin and strict JSON validation. |
| `src/server/appointments/reception-appointment-check-in.ts` | Serializable check-in transaction, Employee/Reception recheck, Patient identity comparison, Appointment lifecycle change, QueueEntry creation, history, and audit. |
| `src/server/appointments/reception-appointment-check-in-policy.ts` | Check-in actor/appointment eligibility, same-clinic-day policy, early target, inclusive 10-minute grace, and explicit late-arrival acceptance rules. |
| `src/server/appointments/reception-appointment-check-in-validation.ts` | Strict Zod body and appointment ID validation using the existing identity verification schema. |
| `src/server/appointments/doctor-queue-number.ts` | Shared per-doctor/Cairo-local-day queue-number allocator using the DoctorProfile row as a transaction mutex. Future Walk-in queue creation must reuse this helper. |
| `tests/unit/reception-appointment-check-in-policy.test.ts` | Unit coverage for employee/role, Patient and guest-link eligibility, appointment states, same-day policy, and arrival boundaries. |
| `tests/unit/reception-appointment-check-in-validation.test.ts` | Unit coverage for two distinct identifiers and rejection of caller-supplied Patient, actor, status, and queue fields. |
| `tests/e2e/reception-appointment-check-in.spec.ts` | Unauthenticated access and forged queue/identity field protection tests. |
| `docs/appointments/phase-6d1-reception-check-in.md` | Feature scope, identity boundary, arrival-time policy, transaction, queue allocation, and exclusions. |

## Files to replace — only two

| Existing file | Change |
|---|---|
| `README.md` | Marks Update 49 / Phase 6C5 complete and Update 50 / Phase 6D1 as the current increment. |
| `docs/implementation-roadmap.md` | Records verified Update 49 and documents Phase 6D1 scope and remaining Phase 6D work. |

## No other files are included for replacement

Do not replace `prisma/schema.prisma`, any migration, `package.json`, lockfiles, `src/server/auth/authorization/*`, existing appointment booking/change services, generated Prisma Client, or environment files.
