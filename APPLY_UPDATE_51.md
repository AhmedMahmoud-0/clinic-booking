# Apply MERUNO Update 51 — Phase 6D2

## Before applying

1. Confirm the local project is at the verified Update 50 state: 528 unit tests across 59 files, 72 E2E tests, typecheck, lint, and production build passed.
2. Back up the current `clinic-booking` project folder or commit the verified Update 50 state to Git.
3. Stop any running Next.js development server before copying files.

## Apply the patch

1. Extract this ZIP directly into the existing `clinic-booking` project root.
2. Merge the included `src`, `tests`, and `docs` folders into the matching project folders.
3. Add all 8 new files listed in `UPDATE_51_FILE_GUIDE.md`.
4. Replace only `README.md` and `docs/implementation-roadmap.md`.
5. Do not remove or replace any other project files.

## Database and dependencies

This update uses the existing `DoctorProfile`, `QueueEntry`, `Patient`, `Appointment`, `Employee`, and `AuditLog` models. It adds no Prisma model, schema change, SQL migration, seed, dependency, package script, environment variable, or configuration change.

- Do not run `prisma migrate dev`, `prisma migrate deploy`, `db push`, or a database reset for this update.
- `npm install` is not required.
- `prisma generate` is not required.

## Verify locally

Run the established verification sequence from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals after the patch, assuming the verified Update 50 baseline and no unrelated local test changes:

- 538 unit tests across 60 files.
- 76 Playwright E2E tests.
- TypeScript, ESLint, and production build succeed.

If any command fails, stop and send the complete output before continuing. Do not edit the Prisma schema or migrations as a workaround.

## Scope reminder

Update 51 adds a protected Reception queue read for one active doctor and the current Cairo-local day, plus a serialized Call Next operation. Queue data is limited to operational ticket fields, patient name/MRN/active flag, and appointment time; it contains no contact or clinical data. Call Next picks the lowest-numbered `WAITING` ticket, keeps an existing `CALLED` ticket idempotently, and blocks if the head-of-queue patient has been deactivated rather than silently skipping that patient.

The operation updates `QueueEntry` only. It does not change Appointment from `CHECKED_IN`, start an Encounter, complete/leave/cancel queue entries, mark no-shows, register walk-ins, or build the visual Reception queue page. No public queue endpoint is added. Future Walk-in queue creation must use the existing `allocateNextDoctorQueueNumber` helper inside the insert transaction.
