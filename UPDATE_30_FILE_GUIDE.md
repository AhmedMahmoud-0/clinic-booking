# Update 30 — File-by-file guide

## New files

| File | Purpose |
|---|---|
| `prisma/migrations/20261108010000_enforce_doctor_schedule_clinic_coverage/migration.sql` | Fifth additive PostgreSQL migration. Adds a no-overlap constraint for a doctor's one-off exceptions, helper functions for clinic coverage, immediate checks on doctor schedule writes, and deferred revalidation when clinic hours/exceptions change. |
| `tests/unit/doctor-schedule-coverage-migration.test.ts` | Eight static contract tests for exception overlap, regular weekly coverage, effective-date containment, Cairo-time matching, extra-hours and blocked semantics, trigger coverage, deferral, and no data rewrites. |
| `docs/database/phase-4b2-doctor-schedule-integrity.md` | Documents the schedule-to-clinic relationship, time-zone rules, and boundaries with Phases 6 and 11. |
| `APPLY_UPDATE_30.md` | Exact application/migration/test steps and rollback stop conditions. |
| `UPDATE_30_FILE_GUIDE.md` | This file-by-file guide. |
| `UPDATE_30_SUMMARY.txt` | Short update summary. |

## Replaced files

| File | Purpose |
|---|---|
| `README.md` | Marks Phase 4B1 complete and Phase 4B2 as the current update. |
| `docs/implementation-roadmap.md` | Records the confirmed Phase 4B1 results and the Phase 4B2 integrity contract. |

## Unchanged intentionally

- `prisma/schema.prisma`: the project already has `DoctorWeeklySchedule`, `DoctorScheduleException`, `ClinicWeeklySchedule`, and `ClinicScheduleException`.
- Existing migrations: all four are retained; Update 30 adds a fifth migration folder only.
- `src/lib/clinic-time.ts`: retains `Africa/Cairo` as the one source of truth for the clinic time zone.
- Seed data: no clinic opening hours or doctor roster is assumed or inserted.
- Appointments: existing appointments and their nullable consultation-room assignments are untouched.
- Auth policy: this database-only integrity step introduces no new API permissions or route handlers.
