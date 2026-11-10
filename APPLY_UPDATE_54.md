# Apply MERUNO Update 54 — Phase 7A Doctor Queue Worklist

## Before applying

1. Confirm Update 53 is the current applied project state and the developer's local checks passed: typecheck, lint, 587 unit tests, 84 E2E tests, and production build.
2. Back up the complete `clinic-booking` project folder or commit the current working tree.
3. Close running Next.js/Playwright processes that could hold files under `.next`.

## Apply files

1. Extract this ZIP directly into the existing `clinic-booking` project root.
2. Merge all new files into their matching folders.
3. Replace only `README.md` and `docs/implementation-roadmap.md`.
4. Do not replace or delete any other files. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, and the local PostgreSQL database.

See `UPDATE_54_FILE_GUIDE.md` for the exact file list.

## Database and dependencies

This update reuses the existing `Employee`, `DoctorProfile`, `QueueEntry`, `Patient`, `Appointment`, and `Encounter` models, plus the existing `clinical.assigned.read` permission and `Africa/Cairo` time helper.

There is no Prisma schema change, migration, seed, Prisma Client generation requirement, dependency, package script, or environment-variable change.

Do not run `db push`, `migrate dev`, `migrate deploy`, database reset, seed, or migration repair for this update.

## Behavior and safety boundary

- `GET /api/doctor/queue` resolves the Doctor profile from the authenticated employee actor; the caller cannot select another `doctorId` or submit patient/employee identifiers.
- The service rechecks active employee status, active `DOCTOR` role assignment, and linked `DoctorProfile` inside a Repeatable Read transaction.
- Only current Cairo-local-day queue tickets for that exact DoctorProfile are returned.
- The DTO contains ticket/appointment/encounter operational states and minimal patient display name/MRN/active flag. It does not return patient contact details, date of birth, reason for visit, clinical notes, diagnoses, prescriptions, or diagnostic results.
- This update does not start an encounter or transition a queue ticket. Those operations are intentionally deferred to the next Doctor increment.
- This is an API/data-layer increment. No Doctor page or visual workspace screen is added.

## Local verification

Run in order from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The patch adds **6 unit tests** and **2 E2E tests**. Assuming no local test files were added or removed after Update 53, expected totals are **593 unit tests** and **86 E2E tests**.

These expected counts are targets only; the local project's output is authoritative. If any command fails, stop and share the complete output before making manual edits.
