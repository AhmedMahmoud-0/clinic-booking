# Apply MERUNO Update 50 — Phase 6D1

## Before applying

1. Confirm the local project is at the verified Update 49 state: 511 unit tests across 57 files, 70 E2E tests, typecheck, lint, and production build passed.
2. Make a backup of the current `clinic-booking` project folder or commit the verified state to Git.
3. Close any running Next.js development server before replacing files.

## Apply the patch

1. Extract this ZIP directly into the existing `clinic-booking` project root.
2. Merge the included `src`, `tests`, and `docs` folders with the same folders in the project.
3. Add all nine new files listed in `UPDATE_50_FILE_GUIDE.md`.
4. Replace only these two existing files:
   - `README.md`
   - `docs/implementation-roadmap.md`
5. Do not remove or replace any other project files.

## Database and dependencies

This update uses the existing `Appointment`, `AppointmentStatusHistory`, `QueueEntry`, `IdentityVerification`, `AuditLog`, and `DoctorProfile` schema. It adds no Prisma model, schema change, SQL migration, seed, dependency, package script, environment variable, or configuration change.

- Do not run `prisma migrate dev`, `prisma migrate deploy`, `db push`, or a database reset for this update.
- `npm install` is not required.
- `prisma generate` is not required.

## Verify locally

Run the established project verification sequence from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals after the patch:

- 528 unit tests across 59 files.
- 72 Playwright E2E tests.
- TypeScript, ESLint, and production build succeed.

The expected totals assume the starting Update 49 state and no unrelated local test changes. If a command fails, stop and share the complete output before continuing.

## Scope reminder

Update 50 adds the Reception check-in API and transactional QueueEntry creation for confirmed appointments whose Patient identity is active and verified. A public guest appointment must already be linked by Reception to the exact Patient record. Check-in is limited to the appointment's Cairo-local date. After the inclusive 10-minute grace period, the Reception employee must explicitly accept the late arrival. The operation never auto-cancels or marks an appointment `NO_SHOW`.

This increment does not add queue calling/advancement, walk-in registration, no-show processing, appointment search/list UI, queue UI, clinical workflows, or notifications. Future QueueEntry creators—including Walk-in registration—must use the shared `allocateNextDoctorQueueNumber` helper inside the same transaction as the queue insert.
