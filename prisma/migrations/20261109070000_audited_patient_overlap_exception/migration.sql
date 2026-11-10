-- Phase 6B3C — narrowly authorized same-patient appointment-overlap exceptions.
-- The doctor and consultation-room exclusion constraints are intentionally untouched.

ALTER TABLE "Patient"
  ADD COLUMN "appointmentScheduleVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "PatientAppointmentOverlapReason" AS ENUM (
  'CLINIC_DIRECTED_RESCHEDULE',
  'CLINICIAN_REQUESTED_FOLLOW_UP',
  'PATIENT_REQUESTED_EXCEPTION',
  'SAME_DAY_SERVICE_COORDINATION'
);

CREATE TABLE "AppointmentPatientOverlapException" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "conflictingAppointmentId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "authorizedByEmployeeId" TEXT NOT NULL,
  "reasonCode" "PatientAppointmentOverlapReason" NOT NULL,
  "appointmentStartsAt" TIMESTAMPTZ(3) NOT NULL,
  "appointmentEndsAt" TIMESTAMPTZ(3) NOT NULL,
  "conflictingStartsAt" TIMESTAMPTZ(3) NOT NULL,
  "conflictingEndsAt" TIMESTAMPTZ(3) NOT NULL,
  "transactionId" BIGINT NOT NULL DEFAULT txid_current(),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "AppointmentPatientOverlapException_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppointmentPatientOverlapException_distinct_appointments_chk"
    CHECK ("appointmentId" <> "conflictingAppointmentId"),
  CONSTRAINT "AppointmentPatientOverlapException_valid_intervals_chk"
    CHECK (
      "appointmentStartsAt" < "appointmentEndsAt" AND
      "conflictingStartsAt" < "conflictingEndsAt" AND
      "appointmentStartsAt" < "conflictingEndsAt" AND
      "appointmentEndsAt" > "conflictingStartsAt"
    ),
  CONSTRAINT "AppointmentPatientOverlapException_subject_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT,
  CONSTRAINT "AppointmentPatientOverlapException_conflict_fkey"
    FOREIGN KEY ("conflictingAppointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT,
  CONSTRAINT "AppointmentPatientOverlapException_patient_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT,
  CONSTRAINT "AppointmentPatientOverlapException_actor_fkey"
    FOREIGN KEY ("authorizedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT,
  CONSTRAINT "AppointmentPatientOverlapException_pair_transaction_key"
    UNIQUE ("appointmentId", "conflictingAppointmentId", "transactionId")
);

CREATE INDEX "AppointmentPatientOverlapException_patient_createdAt_idx"
  ON "AppointmentPatientOverlapException"("patientId", "createdAt");
CREATE INDEX "AppointmentPatientOverlapException_actor_createdAt_idx"
  ON "AppointmentPatientOverlapException"("authorizedByEmployeeId", "createdAt");
CREATE INDEX "AppointmentPatientOverlapException_conflict_createdAt_idx"
  ON "AppointmentPatientOverlapException"("conflictingAppointmentId", "createdAt");

-- Replace only the patient exclusion with an exact-pair, transaction-bound guard.
-- This is necessary because a partial exclusion index cannot authorize one
-- particular overlapping pair while continuing to reject future unapproved pairs.
ALTER TABLE "Appointment"
  DROP CONSTRAINT "Appointment_patient_no_overlap";

CREATE OR REPLACE FUNCTION "meruno_lock_patient_appointment_schedule"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_patient_ids TEXT[];
  v_patient_id TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_patient_ids := CASE
      WHEN NEW."patientId" IS NULL THEN ARRAY[]::TEXT[]
      ELSE ARRAY[NEW."patientId"]
    END;
  ELSIF ROW(NEW."patientId", NEW."startsAt", NEW."endsAt", NEW."status")
      IS DISTINCT FROM ROW(OLD."patientId", OLD."startsAt", OLD."endsAt", OLD."status") THEN
    -- Lock both sides of a patient reassignment in stable order. For a simple
    -- time/status change the DISTINCT set contains only the same patient once.
    SELECT COALESCE(array_agg(patient_id ORDER BY patient_id), ARRAY[]::TEXT[])
      INTO v_patient_ids
      FROM (
        SELECT DISTINCT patient_id
          FROM unnest(ARRAY[OLD."patientId", NEW."patientId"]) AS ids(patient_id)
          WHERE patient_id IS NOT NULL
      ) AS affected;
  ELSE
    RETURN NEW;
  END IF;

  FOREACH v_patient_id IN ARRAY COALESCE(v_patient_ids, ARRAY[]::TEXT[]) LOOP
    -- A real row update is used as a per-patient write mutex. This makes
    -- concurrent scheduling transactions serialize before conflict checks.
    UPDATE "Patient"
      SET "appointmentScheduleVersion" = "appointmentScheduleVersion" + 1
      WHERE "id" = v_patient_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Appointment patient does not exist'
        USING ERRCODE = '23503', CONSTRAINT = 'Appointment_patientId_fkey';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "Appointment_patient_schedule_lock_trg"
  BEFORE INSERT OR UPDATE OF "patientId", "startsAt", "endsAt", "status"
  ON "Appointment"
  FOR EACH ROW
  EXECUTE FUNCTION "meruno_lock_patient_appointment_schedule"();

CREATE OR REPLACE FUNCTION "meruno_validate_patient_overlap_exception"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_subject "Appointment"%ROWTYPE;
  v_conflict "Appointment"%ROWTYPE;
BEGIN
  -- Historical exception rows are transaction-bound and cannot be replayed.
  IF NEW."transactionId" <> txid_current()
     OR NEW."createdAt" <> transaction_timestamp() THEN
    RAISE EXCEPTION 'Patient overlap exception must be created in the current transaction'
      USING ERRCODE = '23514', CONSTRAINT = 'AppointmentPatientOverlapException_current_transaction_chk';
  END IF;

  SELECT * INTO v_subject
    FROM "Appointment"
    WHERE "id" = NEW."appointmentId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The appointment receiving the overlap exception does not exist'
      USING ERRCODE = '23503', CONSTRAINT = 'AppointmentPatientOverlapException_subject_fkey';
  END IF;

  SELECT * INTO v_conflict
    FROM "Appointment"
    WHERE "id" = NEW."conflictingAppointmentId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The conflicting appointment does not exist'
      USING ERRCODE = '23503', CONSTRAINT = 'AppointmentPatientOverlapException_conflict_fkey';
  END IF;

  IF v_subject."patientId" IS DISTINCT FROM NEW."patientId"
     OR v_conflict."patientId" IS DISTINCT FROM NEW."patientId"
     OR v_subject."startsAt" IS DISTINCT FROM NEW."appointmentStartsAt"
     OR v_subject."endsAt" IS DISTINCT FROM NEW."appointmentEndsAt"
     OR v_conflict."startsAt" IS DISTINCT FROM NEW."conflictingStartsAt"
     OR v_conflict."endsAt" IS DISTINCT FROM NEW."conflictingEndsAt"
     OR v_subject."id" = v_conflict."id"
     OR v_subject."source" NOT IN ('RECEPTION', 'PUBLIC_WEBSITE')
     OR v_subject."status" NOT IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION')
     OR v_conflict."status" NOT IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION')
     OR v_subject."startsAt" >= v_conflict."endsAt"
     OR v_subject."endsAt" <= v_conflict."startsAt" THEN
    RAISE EXCEPTION 'The overlap exception does not match two currently overlapping appointments for the same patient'
      USING ERRCODE = '23514', CONSTRAINT = 'AppointmentPatientOverlapException_pair_match_chk';
  END IF;

  -- A public-origin appointment may receive an exception only as part of the
  -- pending guest-to-Patient link transaction. Patient-portal appointments can
  -- never be authorized through this table.
  IF v_subject."source" = 'PUBLIC_WEBSITE' AND NOT EXISTS (
    SELECT 1
      FROM "GuestAppointmentContact" gc
      WHERE gc."appointmentId" = v_subject."id"
        AND gc."resolutionStatus" = 'PENDING_VERIFICATION'
        AND gc."resolvedPatientId" IS NULL
  ) THEN
    RAISE EXCEPTION 'A public guest overlap exception must be created during pending Reception resolution'
      USING ERRCODE = '23514', CONSTRAINT = 'AppointmentPatientOverlapException_guest_resolution_chk';
  END IF;

  -- The dedicated permission is assigned only to Reception in the application
  -- role matrix. The database independently requires an active Reception actor.
  IF NOT EXISTS (
    SELECT 1
      FROM "Employee" e
      JOIN "EmployeeRoleAssignment" ra ON ra."employeeId" = e."id"
      WHERE e."id" = NEW."authorizedByEmployeeId"
        AND e."status" = 'ACTIVE'
        AND ra."status" = 'ACTIVE'
        AND ra."role" = 'RECEPTION'
  ) THEN
    RAISE EXCEPTION 'An active Reception employee is required to authorize a patient overlap exception'
      USING ERRCODE = '42501', CONSTRAINT = 'AppointmentPatientOverlapException_reception_actor_chk';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "AppointmentPatientOverlapException_validate_trg"
  BEFORE INSERT ON "AppointmentPatientOverlapException"
  FOR EACH ROW
  EXECUTE FUNCTION "meruno_validate_patient_overlap_exception"();

CREATE OR REPLACE FUNCTION "meruno_prevent_patient_overlap_exception_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Patient appointment overlap exception records are immutable'
    USING ERRCODE = '55000', CONSTRAINT = 'AppointmentPatientOverlapException_immutable_chk';
END;
$$;

CREATE TRIGGER "AppointmentPatientOverlapException_immutable_trg"
  BEFORE UPDATE OR DELETE ON "AppointmentPatientOverlapException"
  FOR EACH ROW
  EXECUTE FUNCTION "meruno_prevent_patient_overlap_exception_mutation"();

-- Prevent bulk history removal: row-level UPDATE/DELETE protection alone does
-- not fire for TRUNCATE.
CREATE TRIGGER "AppointmentPatientOverlapException_no_truncate_trg"
  BEFORE TRUNCATE ON "AppointmentPatientOverlapException"
  FOR EACH STATEMENT
  EXECUTE FUNCTION "meruno_prevent_patient_overlap_exception_mutation"();

CREATE OR REPLACE FUNCTION "meruno_enforce_patient_appointment_overlap"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current "Appointment"%ROWTYPE;
  v_conflict RECORD;
BEGIN
  -- Moving between blocking statuses (for example CONFIRMED -> CHECKED_IN)
  -- does not create a new scheduling conflict and must retain its prior audit.
  IF TG_OP = 'UPDATE'
     AND ROW(NEW."patientId", NEW."startsAt", NEW."endsAt")
       IS NOT DISTINCT FROM ROW(OLD."patientId", OLD."startsAt", OLD."endsAt")
     AND OLD."status" IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION')
     AND NEW."status" IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION') THEN
    RETURN NEW;
  END IF;

  -- Deferred row triggers can be queued more than once in one transaction.
  -- Always validate the appointment's final committed state, not an intermediate NEW image.
  SELECT * INTO v_current FROM "Appointment" WHERE "id" = NEW."id";
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_current."patientId" IS NULL
     OR v_current."status" NOT IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION') THEN
    RETURN NEW;
  END IF;

  FOR v_conflict IN
    SELECT a."id", a."startsAt", a."endsAt"
      FROM "Appointment" a
      WHERE a."patientId" = v_current."patientId"
        AND a."id" <> v_current."id"
        AND a."status" IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION')
        AND a."startsAt" < v_current."endsAt"
        AND a."endsAt" > v_current."startsAt"
  LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM "AppointmentPatientOverlapException" e
        WHERE e."appointmentId" = v_current."id"
          AND e."conflictingAppointmentId" = v_conflict."id"
          AND e."patientId" = v_current."patientId"
          AND e."appointmentStartsAt" = v_current."startsAt"
          AND e."appointmentEndsAt" = v_current."endsAt"
          AND e."conflictingStartsAt" = v_conflict."startsAt"
          AND e."conflictingEndsAt" = v_conflict."endsAt"
          AND e."transactionId" = txid_current()
          AND (
            v_current."source" = 'RECEPTION'
            OR (
              v_current."source" = 'PUBLIC_WEBSITE'
              AND EXISTS (
                SELECT 1
                  FROM "GuestAppointmentContact" gc
                  WHERE gc."appointmentId" = v_current."id"
                    AND gc."resolutionStatus" = 'LINKED'
                    AND gc."resolvedPatientId" = v_current."patientId"
                    AND gc."resolvedByEmployeeId" = e."authorizedByEmployeeId"
              )
            )
          )
    ) THEN
      RAISE EXCEPTION 'The patient already has an overlapping appointment without an exact Reception exception'
        USING ERRCODE = '23P01', CONSTRAINT = 'Appointment_patient_no_overlap';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "Appointment_patient_no_overlap_guard_trg"
  AFTER INSERT OR UPDATE ON "Appointment"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION "meruno_enforce_patient_appointment_overlap"();

COMMENT ON TABLE "AppointmentPatientOverlapException" IS
  'Immutable, transaction-bound audit evidence authorizing one exact overlapping Patient appointment pair.';
COMMENT ON COLUMN "Patient"."appointmentScheduleVersion" IS
  'Internal write mutex version incremented by appointment scheduling triggers to serialize concurrent same-patient booking changes.';
