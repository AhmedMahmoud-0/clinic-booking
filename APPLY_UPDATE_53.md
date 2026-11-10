# Apply MERUNO Update 53 — Phase 6D4 Reception No-show Recording

## Before applying

1. Confirm Update 52 is the current applied project state and all its local checks passed: typecheck, lint, 561 unit tests, 80 E2E tests, and production build.
2. Back up the complete `clinic-booking` project folder.
3. Close running Next.js/Playwright processes that could hold files under `.next`.

## Apply files

1. Extract this ZIP directly into the existing `clinic-booking` project root.
2. Merge all new files into their matching folders.
3. Replace only `README.md` and `docs/implementation-roadmap.md`.
4. Do not replace or delete any other files. Preserve `.env`, `.git`, `node_modules`, `.next`, generated Prisma Client, package files, Prisma schema, all migrations, and seeds.

See `UPDATE_53_FILE_GUIDE.md` for the exact file list.

## Database and dependencies

This update reuses the existing `Appointment`, `AppointmentStatusHistory`, `GuestAppointmentContact`, `QueueEntry`, `Employee`, and `AuditLog` models and the existing `NO_SHOW` appointment status.

There is no Prisma schema change, migration, seed, Prisma generation requirement, package/dependency change, package script, or environment-variable change.

Do not run `db push`, `migrate dev`, `migrate deploy`, database reset, seed, or migration repair for this update.

## Behavior and safety boundary

- Reception uses an explicit action; no background timer or automatic status transition is introduced.
- Only a still-`CONFIRMED` appointment with no check-in, cancellation/completion timestamp, or queue entry is eligible.
- The inclusive 10-minute grace period must fully elapse. Exactly 10 minutes after start remains inside the grace period; the action is eligible only after more than 10 minutes.
- No same-day restriction is added. An overdue appointment may be recorded later, provided it remains otherwise eligible.
- The route requires `appointment.manage`, same-origin validation, and a currently active Reception employee assignment rechecked in the service transaction.
- The request body must be `{}`. The client cannot choose the patient, status, reason, actor, or timestamp.
- A pending unresolved public guest appointment has its management-token hash invalidated in the same transaction. A linked guest token is already invalidated by the identity-link flow.
- The action records `CONFIRMED` → `NO_SHOW`, `STAFF` status history, and a minimal audit event. It does not create a queue entry, apply a fee, or modify queue-ticket state.

## Local verification

Run in order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals from the patch's added tests: **587 Unit tests across 64 files** and **84 Playwright E2E tests**, plus successful typecheck, lint, and production build.

The expected counts are targets; the local project's output is authoritative. If any command fails, stop and share the complete output before making manual edits.
