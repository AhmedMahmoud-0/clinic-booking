# Update 49 file guide

## New files — add all eight

| File | Purpose |
|---|---|
| `src/app/api/reception/appointments/[appointmentId]/cancel/route.ts` | Authenticated Reception cancellation Route Handler (`appointment.manage`, same-origin, strict JSON). |
| `src/app/api/reception/appointments/[appointmentId]/reschedule/route.ts` | Authenticated Reception rescheduling Route Handler (`appointment.manage`, same-origin, strict JSON). |
| `src/server/appointments/reception-appointment-change.ts` | Serializable transactional operations, employee/role rechecks, locking, schedule/resource checks, status history, and audit events. |
| `src/server/appointments/reception-appointment-change-policy.ts` | Reception actor, patient/guest identity consistency, active appointment eligibility, bounded reason codes, and 24-hour timing classification. |
| `src/server/appointments/reception-appointment-change-validation.ts` | Strict Zod request schemas and appointment ID validation. |
| `tests/unit/reception-appointment-change-policy.test.ts` | Unit tests for active role, appointment eligibility, linked/unlinked guest states, and exact 24-hour classification. |
| `tests/unit/reception-appointment-change-validation.test.ts` | Unit tests for strict reason/time inputs and client-supplied field rejection. |
| `tests/e2e/reception-appointment-change.spec.ts` | Unauthenticated-access and forged-input protection tests for both staff endpoints. |
| `docs/appointments/phase-6c5-reception-appointment-changes.md` | Feature scope, authorization, lifecycle, audit, concurrency, and exclusions. |

> The table contains nine paths because the feature includes two routes, three server modules, three test files, and one feature document. The TypeScript count is eight.

## Files to replace — only two

| Existing file | Change |
|---|---|
| `README.md` | Marks Update 48 / Phase 6C4 complete and Update 49 / Phase 6C5 as the current increment. |
| `docs/implementation-roadmap.md` | Records verified Update 48 and documents Phase 6C5 scope and remaining Reception work. |

## No other files are included for replacement

Do not replace `prisma/schema.prisma`, any migration, `package.json`, lockfiles, auth/permission policy, existing appointment services, generated Prisma Client, or environment files.
