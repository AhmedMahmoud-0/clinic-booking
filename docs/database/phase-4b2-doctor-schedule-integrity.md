# Phase 4B2 — Doctor schedule and clinic-hours integrity

## Purpose

The project already has `DoctorWeeklySchedule` and `DoctorScheduleException` from Phase 2A, and `ClinicWeeklySchedule` / `ClinicScheduleException` from Phase 4B1. This step does not create duplicate models. It adds PostgreSQL integrity rules that keep doctor availability within the single clinic's configured opening hours.

## Rules enforced

1. An active doctor weekly interval must be fully contained by one active clinic weekly interval with the same weekday.
2. The clinic interval's effective-date range must contain the complete doctor schedule effective-date range. When clinic opening hours change over time, doctor schedules must be segmented at the corresponding effective-date boundaries.
3. Weekly minute values continue to use `Africa/Cairo` clinic-local time. No schedule is seeded or inferred.
4. A doctor's `EXTRA_HOURS` exception must be fully contained by an active regular clinic interval or by one clinic `EXTRA_HOURS` exception.
5. A clinic `BLOCKED` exception takes precedence and prevents overlapping doctor `EXTRA_HOURS`.
6. A doctor's one-off exceptions cannot overlap each other, regardless of type.
7. Changes to clinic weekly hours or clinic exceptions revalidate all active doctor schedules and doctor `EXTRA_HOURS` at transaction commit. Deferred checks allow related changes to be made atomically.

## Migration behavior

- Adds one PostgreSQL exclusion constraint and trigger functions/triggers.
- Performs a read-only preflight against existing doctor schedule rows. It fails safely if existing active doctor rows are not covered; it never rewrites or deletes them.
- Does not alter `schema.prisma`, create tables, seed schedules, or alter appointments.
- Requires the existing PostgreSQL `btree_gist` extension, already installed by the earlier scheduling/room integrity migrations; the migration also uses `CREATE EXTENSION IF NOT EXISTS` defensively.

## Not included

- No assumed clinic hours or doctor shifts.
- No schedule-management screen or API in this database-integrity step. Role-scoped configuration screens are part of Phase 11; appointment availability and slot generation are Phase 6.
- No appointment slot generation or appointment rescheduling logic.
- No multi-branch scheduling.
