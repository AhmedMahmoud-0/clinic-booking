-- Phase 6B2: public guest appointment identity, kept separate from Patient/MRN records.
-- Existing patient appointments remain linked to Patient. Guest appointments use a
-- dedicated contact row and cannot enter clinical/queue workflows until staff verify
-- two identity elements and atomically link the appointment to a Patient.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GuestAppointmentResolutionStatus') THEN
    CREATE TYPE "GuestAppointmentResolutionStatus" AS ENUM ('PENDING_VERIFICATION', 'LINKED');
  END IF;
END $$;

-- A public guest is not a verified Patient and must not receive a fabricated MRN.
ALTER TABLE "Appointment" ALTER COLUMN "patientId" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "GuestAppointmentContact" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "fullName" VARCHAR(180) NOT NULL,
  "phone" VARCHAR(30) NOT NULL,
  "normalizedPhone" VARCHAR(15) NOT NULL,
  "email" VARCHAR(254),
  "resolutionStatus" "GuestAppointmentResolutionStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "resolvedPatientId" TEXT,
  "resolvedByEmployeeId" TEXT,
  "resolvedAt" TIMESTAMPTZ(3),
  "manageTokenHash" CHAR(64) NOT NULL,
  "manageTokenIssuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestAppointmentContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GuestAppointmentContact_appointmentId_key"
  ON "GuestAppointmentContact"("appointmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "GuestAppointmentContact_manageTokenHash_key"
  ON "GuestAppointmentContact"("manageTokenHash");
CREATE INDEX IF NOT EXISTS "GuestAppointmentContact_normalizedPhone_createdAt_idx"
  ON "GuestAppointmentContact"("normalizedPhone", "createdAt");
CREATE INDEX IF NOT EXISTS "GuestAppointmentContact_resolutionStatus_createdAt_idx"
  ON "GuestAppointmentContact"("resolutionStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "GuestAppointmentContact_resolvedPatientId_resolvedAt_idx"
  ON "GuestAppointmentContact"("resolvedPatientId", "resolvedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'GuestAppointmentContact_appointmentId_fkey'
      AND conrelid = '"GuestAppointmentContact"'::regclass
  ) THEN
    ALTER TABLE "GuestAppointmentContact"
      ADD CONSTRAINT "GuestAppointmentContact_appointmentId_fkey"
      FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'GuestAppointmentContact_resolvedPatientId_fkey'
      AND conrelid = '"GuestAppointmentContact"'::regclass
  ) THEN
    ALTER TABLE "GuestAppointmentContact"
      ADD CONSTRAINT "GuestAppointmentContact_resolvedPatientId_fkey"
      FOREIGN KEY ("resolvedPatientId") REFERENCES "Patient"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'GuestAppointmentContact_resolvedByEmployeeId_fkey'
      AND conrelid = '"GuestAppointmentContact"'::regclass
  ) THEN
    ALTER TABLE "GuestAppointmentContact"
      ADD CONSTRAINT "GuestAppointmentContact_resolvedByEmployeeId_fkey"
      FOREIGN KEY ("resolvedByEmployeeId") REFERENCES "Employee"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'GuestAppointmentContact_normalizedPhone_digits_chk'
      AND conrelid = '"GuestAppointmentContact"'::regclass
  ) THEN
    ALTER TABLE "GuestAppointmentContact"
      ADD CONSTRAINT "GuestAppointmentContact_normalizedPhone_digits_chk"
      CHECK ("normalizedPhone" ~ '^[0-9]{7,15}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'GuestAppointmentContact_resolution_state_chk'
      AND conrelid = '"GuestAppointmentContact"'::regclass
  ) THEN
    ALTER TABLE "GuestAppointmentContact"
      ADD CONSTRAINT "GuestAppointmentContact_resolution_state_chk"
      CHECK (
        ("resolutionStatus" = 'PENDING_VERIFICATION'
          AND "resolvedPatientId" IS NULL
          AND "resolvedByEmployeeId" IS NULL
          AND "resolvedAt" IS NULL)
        OR
        ("resolutionStatus" = 'LINKED'
          AND "resolvedPatientId" IS NOT NULL
          AND "resolvedByEmployeeId" IS NOT NULL
          AND "resolvedAt" IS NOT NULL)
      );
  END IF;
END $$;

-- Cross-table identity invariant. Deferred checks allow the appointment and guest
-- contact to be created/linked in one transaction while preventing orphaned or
-- contradictory identity states at COMMIT.
CREATE OR REPLACE FUNCTION "enforce_appointment_guest_identity"() RETURNS TRIGGER AS $$
DECLARE
  v_appointment_id TEXT;
  v_patient_id TEXT;
  v_guest_status "GuestAppointmentResolutionStatus";
  v_resolved_patient_id TEXT;
  v_resolved_by_employee_id TEXT;
  v_resolved_at TIMESTAMPTZ(3);
  v_has_guest BOOLEAN;
  v_has_verification BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'Appointment' THEN
    IF TG_OP = 'DELETE' THEN v_appointment_id := OLD."id"; ELSE v_appointment_id := NEW."id"; END IF;
  ELSIF TG_TABLE_NAME = 'GuestAppointmentContact' THEN
    IF TG_OP = 'DELETE' THEN v_appointment_id := OLD."appointmentId"; ELSE v_appointment_id := NEW."appointmentId"; END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN v_appointment_id := OLD."appointmentId"; ELSE v_appointment_id := NEW."appointmentId"; END IF;
  END IF;

  IF v_appointment_id IS NULL THEN RETURN NULL; END IF;

  SELECT
    a."patientId",
    g."resolutionStatus",
    g."resolvedPatientId",
    g."resolvedByEmployeeId",
    g."resolvedAt",
    (g."id" IS NOT NULL)
  INTO
    v_patient_id,
    v_guest_status,
    v_resolved_patient_id,
    v_resolved_by_employee_id,
    v_resolved_at,
    v_has_guest
  FROM "Appointment" a
  LEFT JOIN "GuestAppointmentContact" g ON g."appointmentId" = a."id"
  WHERE a."id" = v_appointment_id;

  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_patient_id IS NULL THEN
    IF NOT v_has_guest
      OR v_guest_status IS DISTINCT FROM 'PENDING_VERIFICATION'::"GuestAppointmentResolutionStatus"
      OR v_resolved_patient_id IS NOT NULL
      OR v_resolved_by_employee_id IS NOT NULL
      OR v_resolved_at IS NOT NULL THEN
      RAISE EXCEPTION 'An appointment without a Patient must have one unresolved guest contact.'
        USING ERRCODE = '23514', CONSTRAINT = 'Appointment_patient_or_unresolved_guest_chk';
    END IF;

    IF EXISTS (
      SELECT 1 FROM "IdentityVerification" v
      WHERE v."appointmentId" = v_appointment_id AND v."result" = 'VERIFIED'
    ) THEN
      RAISE EXCEPTION 'A verified guest identity check must be committed with the Patient link and guest resolution.'
        USING ERRCODE = '23514', CONSTRAINT = 'Appointment_guest_verified_check_requires_link_chk';
    END IF;
  ELSIF v_has_guest THEN
    IF v_guest_status IS DISTINCT FROM 'LINKED'::"GuestAppointmentResolutionStatus"
      OR v_resolved_patient_id IS DISTINCT FROM v_patient_id
      OR v_resolved_by_employee_id IS NULL
      OR v_resolved_at IS NULL THEN
      RAISE EXCEPTION 'A linked guest appointment must resolve to the same Patient and retain its staff resolver.'
        USING ERRCODE = '23514', CONSTRAINT = 'Appointment_guest_patient_link_consistent_chk';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM "IdentityVerification" v
      WHERE v."appointmentId" = v_appointment_id
        AND v."patientId" = v_patient_id
        AND v."performedByEmployeeId" = v_resolved_by_employee_id
        AND v."result" = 'VERIFIED'
        AND v."firstElement" <> v."secondElement"
    ) INTO v_has_verification;

    IF NOT v_has_verification THEN
      RAISE EXCEPTION 'A guest appointment can be linked only with a matching two-element staff identity verification.'
        USING ERRCODE = '23514', CONSTRAINT = 'Appointment_guest_identity_verification_required_chk';
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Appointment_guest_identity_consistency_trg" ON "Appointment";
CREATE CONSTRAINT TRIGGER "Appointment_guest_identity_consistency_trg"
  AFTER INSERT OR UPDATE ON "Appointment"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "enforce_appointment_guest_identity"();

DROP TRIGGER IF EXISTS "GuestAppointmentContact_identity_consistency_trg" ON "GuestAppointmentContact";
CREATE CONSTRAINT TRIGGER "GuestAppointmentContact_identity_consistency_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "GuestAppointmentContact"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "enforce_appointment_guest_identity"();

DROP TRIGGER IF EXISTS "IdentityVerification_guest_identity_consistency_trg" ON "IdentityVerification";
CREATE CONSTRAINT TRIGGER "IdentityVerification_guest_identity_consistency_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "IdentityVerification"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "enforce_appointment_guest_identity"();

-- A guest appointment may be cancelled or marked no-show later, but it cannot
-- enter clinical/queue states before Reception resolves it to a verified Patient.
CREATE OR REPLACE FUNCTION "require_patient_for_appointment_progress"() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."patientId" IS NULL AND NEW."status" IN ('CHECKED_IN', 'WAITING', 'IN_CONSULTATION', 'COMPLETED') THEN
    RAISE EXCEPTION 'A guest appointment must be linked to a verified Patient before check-in or clinical work.'
      USING ERRCODE = '23514', CONSTRAINT = 'Appointment_patient_required_for_progress_chk';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Appointment_patient_required_for_progress_trg" ON "Appointment";
CREATE TRIGGER "Appointment_patient_required_for_progress_trg"
  BEFORE INSERT OR UPDATE OF "patientId", "status" ON "Appointment"
  FOR EACH ROW EXECUTE FUNCTION "require_patient_for_appointment_progress"();

-- Queue/encounter records always require an already-resolved appointment Patient.
CREATE OR REPLACE FUNCTION "require_resolved_patient_for_appointment_work"() RETURNS TRIGGER AS $$
DECLARE
  v_appointment_patient_id TEXT;
BEGIN
  IF NEW."appointmentId" IS NULL THEN RETURN NEW; END IF;

  SELECT a."patientId" INTO v_appointment_patient_id
  FROM "Appointment" a
  WHERE a."id" = NEW."appointmentId";

  IF NOT FOUND OR v_appointment_patient_id IS NULL OR v_appointment_patient_id IS DISTINCT FROM NEW."patientId" THEN
    RAISE EXCEPTION 'Queue and encounter records must use the same verified Patient linked to the appointment.'
      USING ERRCODE = '23514', CONSTRAINT = 'Appointment_work_patient_identity_match_chk';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "QueueEntry_appointment_patient_identity_trg" ON "QueueEntry";
CREATE TRIGGER "QueueEntry_appointment_patient_identity_trg"
  BEFORE INSERT OR UPDATE OF "appointmentId", "patientId" ON "QueueEntry"
  FOR EACH ROW EXECUTE FUNCTION "require_resolved_patient_for_appointment_work"();

DROP TRIGGER IF EXISTS "Encounter_appointment_patient_identity_trg" ON "Encounter";
CREATE TRIGGER "Encounter_appointment_patient_identity_trg"
  BEFORE INSERT OR UPDATE OF "appointmentId", "patientId" ON "Encounter"
  FOR EACH ROW EXECUTE FUNCTION "require_resolved_patient_for_appointment_work"();

-- Guest appointments do not participate in Appointment_patient_no_overlap until
-- Reception resolves them to a real Patient. The existing doctor and room overlap
-- exclusions are unchanged and remain unconditional for all appointments.
