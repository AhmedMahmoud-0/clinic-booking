# Apply Update 45 — Phase 6C1 Patient Self-Service Cancellation

## Before applying

1. Confirm Update 44 is the active local project state and that migration 10 (`20261109070000_audited_patient_overlap_exception`) is applied. The developer already confirmed migration 10 was applied; do not run migration commands for this update.
2. Make a local backup of the current project folder or commit the verified Update 44 state.
3. Extract this ZIP into the existing `clinic-booking` project folder and allow folder merging.
4. Add the new files listed below. Replace only the two files explicitly listed under “Replace”.

## New files to add

- `src/app/api/patient/appointments/[appointmentId]/cancel/route.ts`
- `src/server/appointments/patient-appointment-cancellation.ts`
- `src/server/appointments/patient-appointment-cancellation-policy.ts`
- `src/server/appointments/patient-appointment-cancellation-validation.ts`
- `tests/unit/patient-appointment-cancellation-policy.test.ts`
- `tests/unit/patient-appointment-cancellation-validation.test.ts`
- `tests/e2e/patient-appointment-cancellation.spec.ts`
- `docs/appointments/phase-6c1-patient-self-service-cancellation.md`

## Replace only these files

- `README.md`
- `docs/implementation-roadmap.md`

Do not replace any other file. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, all existing migrations, and every existing source/test file.

## Database and Prisma

This update reuses the existing `Appointment`, `AppointmentStatusHistory`, `PatientAccessGrant`, and Migration 10 structures. It adds no schema or SQL changes.

- Do not run `prisma migrate dev`, `migrate deploy`, `db push`, migration reset, or migration preview.
- Do not run seed scripts.
- No Prisma Client regeneration is required.
- No dependency installation or package/lockfile change is included.

## Local verification

Run the five checks in the established order:

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run test:e2e`
5. `npm run build`

Expected test totals after the two new unit files and one new E2E file:

- 440 unit tests across 49 files.
- 55 Playwright E2E tests.

These counts are expected, not a claim that the local suite has already run. Stop at the first failure and send the complete output before changing any files.
