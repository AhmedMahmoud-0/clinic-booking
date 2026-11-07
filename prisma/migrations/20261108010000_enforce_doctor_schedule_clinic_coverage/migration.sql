-- MERUNO Phase 4B2: keep doctor availability within the single clinic's
-- configured working hours. This migration adds PostgreSQL-only integrity
-- rules; the Prisma models already exist from Phase 2A and Phase 4B1.
-- No schedule rows are inserted, updated, or deleted.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A doctor cannot have overlapping one-off exceptions. Both BLOCKED and
-- EXTRA_HOURS rows are retained as explicit schedule history.
ALTER TABLE "DoctorScheduleException"
    ADD CONSTRAINT "DoctorScheduleException_no_overlap"
    EXCLUDE USING GIST (
        "doctorId" WITH =,
        tstzrange("startsAt", "endsAt", '[)') WITH &&
    );

-- Return true only when one active clinic interval contains the complete
-- doctor interval and the clinic interval's effective dates contain the
-- doctor's complete effective-date range. If clinic hours change, doctor
-- rows must be segmented at the same effective-date boundary.
CREATE OR REPLACE FUNCTION meruno_is_doctor_weekly_schedule_covered(
    p_weekday "Weekday",
    p_start_minute integer,
    p_end_minute integer,
    p_effective_from date,
    p_effective_until date
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM "ClinicWeeklySchedule" AS clinic
        WHERE clinic."weekday" = p_weekday
          AND clinic."isActive" = TRUE
          AND clinic."startMinuteOfDay" <= p_start_minute
          AND clinic."endMinuteOfDay" >= p_end_minute
          AND clinic."effectiveFrom" <= p_effective_from
          AND (
              (p_effective_until IS NULL AND clinic."effectiveUntil" IS NULL)
              OR (
                  p_effective_until IS NOT NULL
                  AND (
                      clinic."effectiveUntil" IS NULL
                      OR clinic."effectiveUntil" >= p_effective_until
                  )
              )
          )
    );
$$;

-- EXTRA_HOURS for a doctor must be completely inside either a normal clinic
-- weekly interval (interpreted in Africa/Cairo) or a specific clinic
-- EXTRA_HOURS exception. A clinic BLOCKED exception always takes precedence.
-- Weekly intervals are minute-based, so their matching exception must start
-- and end on minute boundaries and remain within one Cairo-local date.
CREATE OR REPLACE FUNCTION meruno_is_doctor_extra_hours_clinic_covered(
    p_starts_at timestamptz,
    p_ends_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    local_start timestamp without time zone;
    local_end timestamp without time zone;
    local_weekday "Weekday";
    local_start_minute integer;
    local_end_minute integer;
BEGIN
    IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
        RETURN FALSE;
    END IF;

    -- Explicit clinic closures override both regular and extra opening hours.
    IF EXISTS (
        SELECT 1
        FROM "ClinicScheduleException" AS closure
        WHERE closure."type" = 'BLOCKED'
          AND tstzrange(closure."startsAt", closure."endsAt", '[)')
              && tstzrange(p_starts_at, p_ends_at, '[)')
    ) THEN
        RETURN FALSE;
    END IF;

    -- An explicit clinic extra-hours window may cover an interval spanning
    -- midnight; it must contain the doctor's complete requested interval.
    IF EXISTS (
        SELECT 1
        FROM "ClinicScheduleException" AS extra
        WHERE extra."type" = 'EXTRA_HOURS'
          AND extra."startsAt" <= p_starts_at
          AND extra."endsAt" >= p_ends_at
    ) THEN
        RETURN TRUE;
    END IF;

    local_start := p_starts_at AT TIME ZONE 'Africa/Cairo';
    local_end := p_ends_at AT TIME ZONE 'Africa/Cairo';

    IF local_start::date <> local_end::date
       OR date_trunc('minute', local_start) <> local_start
       OR date_trunc('minute', local_end) <> local_end THEN
        RETURN FALSE;
    END IF;

    local_weekday := (ARRAY[
        'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
        'FRIDAY', 'SATURDAY', 'SUNDAY'
    ]::text[])[EXTRACT(ISODOW FROM local_start)::integer]::"Weekday";

    local_start_minute :=
        EXTRACT(HOUR FROM local_start)::integer * 60
        + EXTRACT(MINUTE FROM local_start)::integer;
    local_end_minute :=
        EXTRACT(HOUR FROM local_end)::integer * 60
        + EXTRACT(MINUTE FROM local_end)::integer;

    RETURN EXISTS (
        SELECT 1
        FROM "ClinicWeeklySchedule" AS clinic
        WHERE clinic."weekday" = local_weekday
          AND clinic."isActive" = TRUE
          AND clinic."effectiveFrom" <= local_start::date
          AND (
              clinic."effectiveUntil" IS NULL
              OR clinic."effectiveUntil" >= local_start::date
          )
          AND clinic."startMinuteOfDay" <= local_start_minute
          AND clinic."endMinuteOfDay" >= local_end_minute
    );
END;
$$;

-- Re-check every active doctor row whenever clinic working hours or clinic
-- exceptions change. The check is deferred until transaction commit so a
-- manager can replace an interval and its dependent doctor rows atomically.
CREATE OR REPLACE FUNCTION meruno_assert_doctor_schedule_clinic_coverage()
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "DoctorWeeklySchedule" AS doctor_schedule
        WHERE doctor_schedule."isActive" = TRUE
          AND NOT meruno_is_doctor_weekly_schedule_covered(
              doctor_schedule."weekday",
              doctor_schedule."startMinuteOfDay",
              doctor_schedule."endMinuteOfDay",
              doctor_schedule."effectiveFrom",
              doctor_schedule."effectiveUntil"
          )
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            CONSTRAINT = 'DoctorWeeklySchedule_clinic_hours_coverage_chk',
            MESSAGE = 'An active doctor weekly schedule must fit entirely inside one active clinic weekly interval with a covering effective-date range.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "DoctorScheduleException" AS doctor_exception
        WHERE doctor_exception."type" = 'EXTRA_HOURS'
          AND NOT meruno_is_doctor_extra_hours_clinic_covered(
              doctor_exception."startsAt",
              doctor_exception."endsAt"
          )
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            CONSTRAINT = 'DoctorScheduleException_clinic_hours_coverage_chk',
            MESSAGE = 'A doctor EXTRA_HOURS exception must fit inside clinic weekly hours or a clinic EXTRA_HOURS exception and must not overlap a clinic BLOCKED exception.';
    END IF;
END;
$$;

-- Fail safely before installing the triggers if historical rows (if any) do
-- not satisfy the newly enforced relationship. No data is silently repaired.
DO $$
BEGIN
    PERFORM meruno_assert_doctor_schedule_clinic_coverage();
END;
$$;

CREATE OR REPLACE FUNCTION meruno_validate_doctor_weekly_schedule_row()
RETURNS trigger
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF NEW."isActive" = TRUE
       AND NOT meruno_is_doctor_weekly_schedule_covered(
           NEW."weekday",
           NEW."startMinuteOfDay",
           NEW."endMinuteOfDay",
           NEW."effectiveFrom",
           NEW."effectiveUntil"
       ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            CONSTRAINT = 'DoctorWeeklySchedule_clinic_hours_coverage_chk',
            MESSAGE = 'The doctor weekly interval is outside the clinic working hours or its effective-date range.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "DoctorWeeklySchedule_clinic_hours_coverage_trg"
BEFORE INSERT OR UPDATE OF
    "weekday", "startMinuteOfDay", "endMinuteOfDay",
    "effectiveFrom", "effectiveUntil", "isActive"
ON "DoctorWeeklySchedule"
FOR EACH ROW
EXECUTE FUNCTION meruno_validate_doctor_weekly_schedule_row();

CREATE OR REPLACE FUNCTION meruno_validate_doctor_schedule_exception_row()
RETURNS trigger
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF NEW."type" = 'EXTRA_HOURS'
       AND NOT meruno_is_doctor_extra_hours_clinic_covered(
           NEW."startsAt",
           NEW."endsAt"
       ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            CONSTRAINT = 'DoctorScheduleException_clinic_hours_coverage_chk',
            MESSAGE = 'The doctor EXTRA_HOURS interval must be covered by clinic opening hours and must not overlap a clinic BLOCKED exception.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "DoctorScheduleException_clinic_hours_coverage_trg"
BEFORE INSERT OR UPDATE OF "type", "startsAt", "endsAt"
ON "DoctorScheduleException"
FOR EACH ROW
EXECUTE FUNCTION meruno_validate_doctor_schedule_exception_row();

CREATE OR REPLACE FUNCTION meruno_recheck_doctor_schedule_clinic_coverage_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM meruno_assert_doctor_schedule_clinic_coverage();
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "ClinicWeeklySchedule_doctor_coverage_trg"
AFTER INSERT OR UPDATE OR DELETE
ON "ClinicWeeklySchedule"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION meruno_recheck_doctor_schedule_clinic_coverage_trigger();

CREATE CONSTRAINT TRIGGER "ClinicScheduleException_doctor_coverage_trg"
AFTER INSERT OR UPDATE OR DELETE
ON "ClinicScheduleException"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION meruno_recheck_doctor_schedule_clinic_coverage_trigger();
