# Apply MERUNO Update 55 — Phase 7B Doctor Starts a Consultation

## Before applying

1. Confirm Update 54 is applied and the five local checks passed: typecheck, lint, 593 unit tests, 86 E2E tests, and production build.
2. Back up the complete `clinic-booking` project folder or commit the current working tree.
3. Close running Next.js/Playwright processes that could hold files under `.next`.

## Apply files

1. Extract this ZIP directly into the existing `clinic-booking` project root.
2. Merge all new files into their matching folders.
3. Replace only these existing files when prompted:
   - `src/server/appointments/doctor-worklist.ts`
   - `README.md`
   - `docs/implementation-roadmap.md`
4. Do not replace or delete any other files. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, and the local PostgreSQL database.

See `UPDATE_55_FILE_GUIDE.md` for the complete exact file list.

## Database and dependencies

This update reuses the existing `Employee`, `DoctorProfile`, `QueueEntry`, `Patient`, `Appointment`, `AppointmentStatusHistory`, `Encounter`, and `AuditLog` models and the existing `clinical.encounter.manage` permission.

There is no Prisma schema change, migration, seed, Prisma Client generation requirement, dependency, package script, or environment-variable change. Do not run `db push`, `migrate dev`, `migrate deploy`, database reset, seed, or migration repair for this update.

## Behavior and safety boundary

- `POST /api/doctor/queue/:queueEntryId/start` requires the authenticated Doctor's exact permission and active Doctor assignment/profile. A queue ticket owned by another Doctor or a previous clinic-local day is not exposed.
- The request body must be `{}` and query parameters are rejected. Patient, appointment, Doctor, Encounter, status, timestamps, and actor come from server-side records and the authenticated session.
- Only a `CALLED` ticket for an active patient can start. Appointment tickets must be linked consistently to the same Patient and Doctor and remain checked in. Walk-ins must not have an appointment link.
- The service locks the shared `DoctorProfile` mutex, the exact queue ticket, and the appointment when applicable. A Doctor cannot start a second ticket while another ticket is in `IN_SERVICE`.
- One `IN_PROGRESS` Encounter is created atomically with the queue transition to `IN_SERVICE`. Appointment visits link the Encounter through `appointmentId` only; walk-ins link through `queueEntryId` only. Appointment visits also transition to `IN_CONSULTATION` and append staff status history.
- Retrying the same already-started request returns `ALREADY_STARTED` and does not create a duplicate Encounter or audit event.
- The Doctor worklist now reads Encounters through the correct source relation for both appointment and walk-in visits.
- No clinical note, diagnosis, vital sign, prescription, lab/radiology order, referral, follow-up, completion, approval, Doctor UI, or Nurse workflow is added.

All records remain synthetic. MERUNO is a portfolio/demo application, not production clinical software.

## Local verification

Run in order from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The patch adds **20 unit tests** and **3 E2E tests**. Assuming no local test files were added or removed after Update 54, expected totals are **613 unit tests** and **89 E2E tests**.

These expected counts are targets only; the local project's output is authoritative. If any command fails, stop and share the complete output before making manual edits.
