# Update 66 — Fix 01 File Guide

This is a focused code/type-safety repair for Update 66. It does not change the approved feature scope, Prisma schema, migration history, or database contents.

## Files replaced

| File | Exact change |
|---|---|
| `src/server/appointments/nursing-workflow.ts` | Makes the linked Doctor profile ID explicit and nullable-safe before comparing Encounter ownership. Uses `Prisma.NursingTaskUncheckedUpdateManyInput` for the guarded task `updateMany`, because completion/escalation updates include server-controlled employee foreign-key scalar fields. Encounter/task row locks and conditional status matching remain in place. |
| `src/server/appointments/nursing-workflow-policy.ts` | Models `Appointment.patientId` as nullable at the source-consistency policy boundary and rejects unresolved guest appointments from being treated as a valid clinical Encounter source. |
| `tests/unit/nursing-workflow-policy.test.ts` | Adds a regression test proving that an appointment with unresolved `patientId` cannot pass Encounter/queue source consistency. |

## Files not changed

- `prisma/schema.prisma`
- Migration 13: `20261110210000_nursing_task_and_vital_sign_workflow`
- Existing migrations 1–13
- `.env`, `.git`, package files, generated Prisma Client, and database contents
- API routes, UI, authorization boundaries, transaction ordering, and feature behavior outside the three corrections above
