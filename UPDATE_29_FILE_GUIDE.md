# Update 29 — File-by-file guide

## New files

| File | Purpose |
|---|---|
| `prisma/migrations/20261108000000_add_clinic_working_hours/migration.sql` | Additive PostgreSQL migration creating clinic weekly hours and date-specific exceptions, with checks, indexes, creator FK, and overlap protection. |
| `src/lib/clinic-time.ts` | Central `Africa/Cairo` time-zone policy and deterministic conversion from an instant to clinic-local date, weekday, local clock time, and minutes after midnight. |
| `tests/unit/clinic-working-hours-migration.test.ts` | Six tests covering migration tables, ranges, overlap rules, creator FK, and no seed/backfill of existing records. |
| `tests/unit/clinic-time.test.ts` | Three tests for the configured IANA zone, a known UTC-to-Cairo conversion, and invalid-date rejection. |
| `docs/database/phase-4b-clinic-working-hours.md` | Domain semantics, relation to the already existing doctor schedule models, and scope boundaries. |

## Replaced files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Adds `ClinicWeeklySchedule`, `ClinicScheduleException`, and the optional employee creator back-relation. Existing doctor schedules, appointment models, and all previous auth/domain models are retained. |
| `README.md` | Records Phase 4A as locally verified and Phase 4B1 as the current update. |
| `docs/implementation-roadmap.md` | Updates the phase status and records the Phase 4B1 implementation contract and remaining Phase 4 work. |

## Important semantics

- `ClinicWeeklySchedule` supports more than one time interval on a weekday. Overlapping active intervals for the same weekday/effective date range are rejected by PostgreSQL.
- A weekday without an active row is not configured as open. No default hours are assumed.
- `BLOCKED` exceptions close a period; `EXTRA_HOURS` explicitly opens extra time. Exceptions are stored as timezone-aware instants and cannot overlap one another.
- Existing `DoctorWeeklySchedule` already has minute/date checks and a PostgreSQL no-overlap constraint. This update retains it and does not assign any doctor shifts.
- Appointment availability/slot generation and staff configuration screens are intentionally deferred to Phases 6 and 11.
