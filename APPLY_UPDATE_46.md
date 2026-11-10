# Apply Update 46 — Phase 6C2 Patient Self-Service Rescheduling

## Before applying

1. Confirm Update 45 is the active local state and all five local checks passed (440 unit tests, 55 E2E tests, typecheck, lint, and production build).
2. Make a local backup of the verified Update 45 project folder or commit it.
3. Extract this ZIP into the existing `clinic-booking` project folder and allow folder merging.
4. Add the new files listed below. Replace only the two files listed under “Replace”.

## New files

- `src/app/api/patient/appointments/[appointmentId]/reschedule/route.ts`
- `src/server/appointments/patient-appointment-rescheduling.ts`
- `src/server/appointments/patient-appointment-rescheduling-policy.ts`
- `src/server/appointments/patient-appointment-rescheduling-validation.ts`
- `tests/unit/patient-appointment-rescheduling-policy.test.ts`
- `tests/unit/patient-appointment-rescheduling-validation.test.ts`
- `tests/e2e/patient-appointment-rescheduling.spec.ts`
- `docs/appointments/phase-6c2-patient-self-service-rescheduling.md`

## Replace only these files

- `src/server/appointments/appointment-availability.ts`
- `README.md`
- `docs/implementation-roadmap.md`

The availability service change adds an internal-only `excludeAppointmentId` option so an appointment does not block its own replacement slot. The public availability query schema remains strict and unchanged.

Do not replace any other file. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, every migration, Prisma schema, package files, and every existing source/test file.

## Business rules

- Self-service is available only for a confirmed appointment linked to a Patient and at least 24 hours before its existing start.
- A delegate must have exact `MANAGE_APPOINTMENTS` authority; `BOOK_APPOINTMENTS` is insufficient.
- Guest appointments without a Patient link are excluded.
- The patient can change date/time only. Doctor, service, duration, booked price, currency, booking reference, and original confirmation time remain unchanged.
- Replacement slot must be offered by current availability for the same doctor/service. Patient, doctor, and room conflicts are rechecked in a Serializable transaction.
- Patient self-service cannot use the Reception overlap exception.
- A history event records patient actor, timestamp, and previous/new UTC starts while retaining `CONFIRMED` status.

## Database and Prisma

No Prisma schema or SQL migration is included. Do not run migrate, db push, migration preview, migration reset, seed, or Prisma generate. No package, lockfile, dependency, or environment changes are included.

## Local verification

Run the five checks in order:

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run test:e2e`
5. `npm run build`

Expected totals after this increment:

- 458 unit tests across 51 files.
- 57 Playwright E2E tests.

These are expected counts, not a claim that the local project test suite has already run. Stop at the first failure and send the complete output before changing files.
