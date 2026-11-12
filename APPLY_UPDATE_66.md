# Apply Update 66 — Combined Phase 7M Nursing, Vital Signs, and Encounter Completion

## Before applying

1. Confirm Update 65 is installed and all five checks passed. The verified baseline is **928 unit tests across 87 files** and **128 Playwright E2E tests**.
2. Back up the complete `clinic-booking` project folder and take a local PostgreSQL backup using your normal backup method.
3. Stop the Next.js dev server and close any process using the project files.
4. Before copying Update 66, run `npm run db:migrate:status`. The database must report all existing migrations (through Migration 12) applied and up to date. If an earlier migration is pending or the database history differs, stop and send the output before applying this package.

## Apply files

1. Extract `MERUNO_Update_66_Phase_7M_Nursing_Vitals_Encounter_Completion.zip` into the existing `clinic-booking` project root and merge the folders.
2. Add the new files at the exact paths listed in `UPDATE_66_FILE_GUIDE.md`.
3. Replace only these existing files:
   - `prisma/schema.prisma`
   - `README.md`
   - `docs/implementation-roadmap.md`
4. Add Migration 13 at:
   - `prisma/migrations/20261110210000_nursing_task_and_vital_sign_workflow/migration.sql`
5. Do not replace or delete any other existing files.

Keep `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, all migrations 1–12, and the local PostgreSQL database unchanged.

## Prisma and Migration 13

From the project root, run the following in order:

```powershell
npm run db:validate
npm run db:generate
npm run db:migrate:status
```

After adding this package, the migration-status command must show **Migration 13 as the only pending migration**:

`20261110210000_nursing_task_and_vital_sign_workflow`

If Migration 13 is not the only pending migration, stop. Do not deploy out of order, reset the database, or use `db push`.

When exactly Migration 13 is pending, apply it:

```powershell
npx prisma migrate deploy --config=./prisma7.config.ts
npm run db:migrate:status
```

The final status must report the database schema is up to date. Migration 13 is additive:

- Creates the `NursingTaskType` and `NursingTaskStatus` enums.
- Creates `NursingTask`, its status consistency checks, indexes, and restrictive foreign keys.
- Adds nullable `VitalSign.nursingTaskId` and its foreign key/index.
- Does not rewrite, backfill, delete, or reset existing `VitalSign` rows. Existing measurements retain `nursingTaskId = NULL`.
- Does not require seed commands, migration-preview generation, `db push`, or `migrate reset`.

## Verify locally

After Prisma validation, generation, and successful Migration 13 deployment, run the normal five checks in this exact order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming no unrelated tests were added or removed after Update 65:

- **989 unit tests across 90 files** (61 new: 38 workflow-policy + 17 validation + 6 migration-contract)
- **138 Playwright E2E tests** (10 new)

These are expected totals, not a claim that the checks have run on your computer. If any Prisma step or verification command fails, stop and send the complete output before applying another update.

## Workflow boundaries

- Only the active Doctor assigned to an in-progress Encounter can assign, resolve, or cancel that Encounter's nursing tasks, or complete the Encounter.
- Tasks are assignable only to active employees with the active Nurse role. Nurses see only their own assigned tasks and may start, complete, or escalate them.
- A Nurse cannot diagnose, prescribe, edit/sign Doctor notes, or complete an Encounter.
- A task of type `RECORD_VITAL_SIGNS` or `REPEAT_VITAL_SIGNS` requires at least one measurement linked to that task before it can be completed.
- Escalation requires a Nurse-entered note and creates a minimal in-app notification to the Encounter's Doctor. No clinical note content is copied into the notification or AuditLog.
- Vital-sign values are appended to the existing `VitalSign` model. Actor, timestamp, task link, and BMI are server-controlled. Validation limits are data-entry plausibility checks, not clinical thresholds or medical advice. A Nurse manually escalates a concerning finding according to the clinic protocol; no automated triage thresholds are introduced.
- Encounter completion requires exactly one signed initial assessment authored by the current Doctor, no open nursing tasks, and no draft prescriptions. For scheduled appointments, it completes both the Appointment and its linked APPOINTMENT QueueEntry; for Walk-ins, it completes the linked WALK_IN QueueEntry. The Encounter and source records are updated atomically. Open diagnostic orders/referrals may remain for post-visit follow-up.
- All demo records must remain synthetic. MERUNO is a portfolio/demo application, not production clinical software. No remote environment or deployment is modified by this update.
