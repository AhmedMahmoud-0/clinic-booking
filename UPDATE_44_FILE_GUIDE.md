# UPDATE 44 — FILE GUIDE

## New files — add these

1. `prisma/migrations/20261109070000_audited_patient_overlap_exception/migration.sql`
2. `src/server/appointments/patient-overlap-exception-validation.ts`
3. `src/server/appointments/patient-overlap-exception-policy.ts`
4. `tests/unit/patient-overlap-exception-validation.test.ts`
5. `tests/unit/patient-overlap-exception-policy.test.ts`
6. `tests/unit/patient-overlap-exception-migration.test.ts`
7. `docs/appointments/phase-6b3c-audited-patient-overlap-exception.md`

## Files to replace — replace only these exact paths

1. `prisma/schema.prisma`
2. `src/server/appointments/appointment-booking.ts`
3. `src/server/appointments/reception-appointment-booking-validation.ts`
4. `src/server/appointments/guest-appointment-resolution-validation.ts`
5. `src/server/auth/authorization/types.ts`
6. `src/server/auth/authorization/policy.ts`
7. `src/app/api/reception/appointments/route.ts`
8. `src/app/api/reception/appointments/[appointmentId]/resolve-guest/route.ts`
9. `tests/e2e/reception-appointment-booking.spec.ts`
10. `tests/e2e/guest-appointment-resolution.spec.ts`
11. `README.md`
12. `docs/implementation-roadmap.md`

## Explicitly preserve

- `.env`, `.git`, `node_modules`, `.next`, and `generated/prisma`
- `package.json`, `package-lock.json`, and `prisma7.config.ts`
- `prisma/migrations/migration_lock.toml`
- Every existing migration from 1 through 9
- All files not named above

## What changed

- A dedicated `appointment.patient-overlap.override` permission is assigned only to the Reception role.
- Both existing-patient Reception booking and Reception guest-to-Patient linking accept only a bounded reason code when a real overlap exists.
- A PostgreSQL `AppointmentPatientOverlapException` table records every exact conflicting pair and is append-only, including protection against `TRUNCATE`.
- A deferred trigger checks the final appointment state at commit and requires the matching exception record for each overlap. A per-patient write mutex serializes concurrent scheduling changes.
- Only patient overlap protection changes. Doctor and room exclusion constraints remain untouched.
- Existing E2E route-guard tests are updated to include unauthenticated override-spoofing attempts. Three new unit suites add 19 tests.

No dependencies, lockfiles, environment variables, seed files, prior migrations, or UI components are added or changed.
