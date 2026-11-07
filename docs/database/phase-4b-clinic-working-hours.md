# Phase 4B1 — Clinic Working Hours and Local-Time Foundation

## Scope

This update adds the single-branch clinic's weekly operating-hour catalog and date-specific exceptions. It complements (and does not replace) the existing `DoctorWeeklySchedule` and `DoctorScheduleException` models.

The first release is one outpatient clinic in Egypt. The application time-zone constant is `Africa/Cairo`. Weekly schedule values are wall-clock minutes after midnight in that zone; one-off exceptions are stored as timezone-aware instants (`timestamptz`). All conversion from an instant to a weekday/date/minute must go through `src/lib/clinic-time.ts`, never the developer machine's local time zone.

## Existing doctor schedule foundation retained

`DoctorWeeklySchedule` already contains:

- `weekday` using the shared `Weekday` enum;
- `startMinuteOfDay` and `endMinuteOfDay` in the clinic's local time;
- effective-from/effective-until dates and an active flag;
- PostgreSQL checks for valid minute/date ranges and a GiST exclusion constraint against intersecting active weekday/date/time windows.

`DoctorScheduleException` already represents per-doctor `BLOCKED` and `EXTRA_HOURS` date/time windows. This update does not rewrite these records or invent doctor shifts.

## New models

### `ClinicWeeklySchedule`

- Stores one weekly opening interval for a weekday.
- Supports multiple intervals on the same weekday for split shifts.
- A day with no active row is closed; no default day/hour is assumed.
- Minute range is `[startMinuteOfDay, endMinuteOfDay)`, where start is at least 0, end is at most 1440, and start is strictly less than end.
- Effective dates are inclusive. An omitted `effectiveUntil` means no scheduled end date.
- A PostgreSQL GiST exclusion constraint blocks overlapping active intervals for the same weekday where their effective-date ranges intersect.

### `ClinicScheduleException`

- Reuses `ScheduleExceptionType`: `BLOCKED` means the clinic is unavailable during that instant range; `EXTRA_HOURS` explicitly adds an opening window outside the normal weekly pattern.
- `startsAt` and `endsAt` are `timestamptz` instants. API callers must send explicit timezone offsets and convert local clinic values consistently.
- End must be later than start.
- Exception windows cannot overlap one another, preventing contradictory block/extra-hour rows. An exception may intentionally overlap the normal weekly pattern because it overrides or extends it.
- The optional creator references the existing Employee row and becomes null if that employee is later removed; the exception itself remains.

## Data not seeded

No weekly opening hours, closed weekdays, clinic exceptions, doctor shifts, or doctor exceptions are seeded. The design archive contains sample hours, but it does not establish approved operational hours. Configure the actual weekly pattern later through the administrative workflow. Eight doctors do not imply eight shifts or eight rooms.

## Not implemented by this update

- No CRUD API or manager/admin screen is added here. Configuration screens and audit workflows belong to Phase 11.
- No appointment slot generation or booking-time availability enforcement is added. Those belong to Phase 6, which must combine clinic hours, doctor schedules, doctor exceptions, consultation-room availability, service duration, and existing doctor/patient overlap constraints.
- This migration does not backfill or alter `DoctorWeeklySchedule`, `DoctorScheduleException`, `Appointment`, or existing catalog records.

## Migration safety

This is an additive fourth migration after the three migrations already confirmed locally. It creates two tables, their indexes/checks/exclusion constraints, and one optional Employee foreign key. It inserts no data and drops nothing. `btree_gist` is already used by earlier migrations; the migration also keeps an idempotent `CREATE EXTENSION IF NOT EXISTS` guard.
