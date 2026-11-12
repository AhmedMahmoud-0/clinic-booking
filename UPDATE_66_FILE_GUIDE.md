# Update 66 — Combined Phase 7 Nursing, Vital Signs, and Encounter Completion

This update combines three dependent server-side workflow increments in one batch:

1. Doctor assignment and Nurse execution of nursing tasks, including escalation back to the Encounter's Doctor.
2. Vital-sign recording attached to the assigned in-progress nursing task.
3. Doctor Encounter completion after its signed initial assessment, nursing tasks, and prescriptions meet the closure requirements.

## New files

| File | Purpose |
| --- | --- |
| `src/server/appointments/nursing-workflow-policy.ts` | Pure permission, task-lifecycle, escalation-resolution, and Encounter-completion policies. |
| `src/server/appointments/nursing-workflow-validation.ts` | Strict request schemas for task assignment, Nurse actions, measurements, escalation resolution, and completion. |
| `src/server/appointments/nursing-workflow.ts` | Transactional services for Doctor assignment, Nurse task work, vitals, escalation/notification, and Encounter completion. |
| `src/app/api/doctor/encounters/[encounterId]/nursing-tasks/route.ts` | Doctor reads/assigns nursing tasks for their own Encounter. |
| `src/app/api/doctor/encounters/[encounterId]/nursing-tasks/[taskId]/route.ts` | Doctor resumes an escalated task or cancels an unresolved task. |
| `src/app/api/doctor/encounters/[encounterId]/complete/route.ts` | Doctor closes a completed Encounter under explicit server-side prerequisites, including consistent closure of the originating Appointment plus its APPOINTMENT QueueEntry, or the Walk-in QueueEntry. |
| `src/app/api/nurse/tasks/route.ts` | Nurse reads only tasks assigned to their own employee identity. |
| `src/app/api/nurse/tasks/[taskId]/route.ts` | Assigned Nurse starts, completes, or escalates a task. |
| `src/app/api/nurse/tasks/[taskId]/vital-signs/route.ts` | Assigned Nurse reads/records measurements associated with a started vital-sign task. |
| `tests/unit/nursing-workflow-policy.test.ts` | Unit coverage for assignment, lifecycle, resolution, and closure policies. |
| `tests/unit/nursing-workflow-validation.test.ts` | Input validation, measurement bounds, blood-pressure pairing, and client-forged metadata tests. |
| `tests/unit/nursing-workflow-migration.test.ts` | Additive migration contract tests. |
| `tests/e2e/nursing-workflow.spec.ts` | Playwright authentication and forged-field boundary tests. |
| `prisma/migrations/20261110210000_nursing_task_and_vital_sign_workflow/migration.sql` | Migration 13: NursingTask table/enums, constraints, indexes, cancellation reason, and nullable VitalSign link. |
| `docs/clinical/phase-7m-nursing-vitals-and-encounter-completion.md` | Clinical workflow behavior and limits. |

## Existing files replaced

| File | Change |
| --- | --- |
| `prisma/schema.prisma` | Adds NursingTask enums/model, employee/Encounter reverse relations, and nullable `VitalSign.nursingTaskId`. |
| `README.md` | Records Update 65 as verified by the developer and Update 66 as the current local verification increment. |
| `docs/implementation-roadmap.md` | Marks Phase 7L verified; records Phase 7M implementation and remaining work. |

## Explicit behavior

- Only the active Doctor assigned to the Encounter can assign/cancel/resume its nursing tasks or complete that Encounter.
- Tasks can be assigned only to active employees with an active `NURSE` role.
- A Nurse sees only tasks assigned to their own authenticated employee ID. A Nurse cannot diagnose, prescribe, change a Doctor's note, or complete an Encounter.
- Only the assigned Nurse can start, complete, escalate, or record measurements for their task.
- Vital signs are recorded as append-only rows. The server controls recorder, time, task link, and BMI. The supplied numeric bounds are data-entry plausibility checks, not clinical alert thresholds or medical advice.
- A measurement task cannot be completed without at least one attached VitalSign record.
- A Nurse escalation creates an in-app notification to the Encounter's Doctor without copying the clinical escalation note into the notification. The full note remains restricted to the task/Doctor view and is not copied into AuditLog.
- Encounter completion requires exactly one signed initial assessment authored by the current Doctor, no pending/in-progress/escalated nursing tasks, and no draft prescriptions. Approved diagnostic orders and referrals may remain open for post-visit follow-up; Encounter completion does not mean diagnostic follow-up is complete.
- Completion updates the Encounter and all originating workflow records atomically: a scheduled Appointment and its APPOINTMENT QueueEntry are both moved to COMPLETED, while a Walk-in QueueEntry is moved to COMPLETED. AppointmentStatusHistory and an audit event are recorded.
- Every mutating workflow locks Encounter first, so task creation/transitions and Encounter completion serialize against each other.

## Database change

Migration 13 is additive. Existing VitalSign rows receive `nursingTaskId = NULL`; no historical rows are rewritten or deleted. Appointment Encounters are additionally required to have a consistent APPOINTMENT QueueEntry in IN_SERVICE (or COMPLETED for an already completed Encounter). The migration adds one new task table, two enums, foreign keys, indexes, and status consistency checks.
