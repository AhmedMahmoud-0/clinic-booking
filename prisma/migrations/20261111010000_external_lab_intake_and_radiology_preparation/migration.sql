-- Phase 8F–8H: external laboratory referrals/intake and radiology scheduling
-- preparation metadata. This is an incremental migration; it does not reset,
-- recreate, or rewrite any previous database objects.

CREATE TYPE "PatientRecordType" AS ENUM ('FULL', 'DIAGNOSTIC_ONLY');
CREATE TYPE "ExternalLabIntakeSource" AS ENUM ('PAPER', 'ELECTRONIC');
CREATE TYPE "ExternalLabReferralStatus" AS ENUM ('REFERRED', 'RESULT_RECEIVED', 'REVIEWED', 'CANCELLED');
CREATE TYPE "RadiologyExamPreparationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'NOT_REQUIRED', 'ISSUE_REPORTED');

ALTER TYPE "PatientConsentType" ADD VALUE 'EXTERNAL_DIAGNOSTIC_DATA_SHARING';

ALTER TABLE "Patient"
  ADD COLUMN "recordType" "PatientRecordType" NOT NULL DEFAULT 'FULL';

CREATE TABLE "PatientRecordTypeHistory" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "fromType" "PatientRecordType" NOT NULL,
  "toType" "PatientRecordType" NOT NULL,
  "changedByEmployeeId" TEXT NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientRecordTypeHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientRecordTypeHistory_transition_chk" CHECK ("fromType" <> "toType" AND length(btrim("reason")) > 0)
);

CREATE TABLE "ExternalLabIntake" (
  "id" TEXT NOT NULL,
  "intakeReference" VARCHAR(30) NOT NULL,
  "patientId" TEXT NOT NULL,
  "requestSource" "ExternalLabIntakeSource" NOT NULL,
  "referringProviderName" VARCHAR(180) NOT NULL,
  "referringFacilityName" VARCHAR(180) NOT NULL,
  "referringProviderContact" VARCHAR(100),
  "externalRequestReference" VARCHAR(80),
  "requestNotes" VARCHAR(1000),
  "createdByEmployeeId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ExternalLabIntake_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalLabReferral" (
  "id" TEXT NOT NULL,
  "referralReference" VARCHAR(30) NOT NULL,
  "encounterId" TEXT NOT NULL,
  "testName" VARCHAR(180) NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "externalFacilityName" VARCHAR(180) NOT NULL,
  "externalFacilityContact" VARCHAR(100),
  "status" "ExternalLabReferralStatus" NOT NULL DEFAULT 'REFERRED',
  "consentId" TEXT NOT NULL,
  "resultSummary" TEXT,
  "resultReceivedAt" TIMESTAMPTZ(3),
  "resultReceivedByEmployeeId" TEXT,
  "reviewedByEmployeeId" TEXT,
  "reviewedAt" TIMESTAMPTZ(3),
  "reviewNotes" VARCHAR(1000),
  "cancelledAt" TIMESTAMPTZ(3),
  "cancelledByEmployeeId" TEXT,
  "cancellationReason" VARCHAR(500),
  "createdByEmployeeId" TEXT NOT NULL,
  "referredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ExternalLabReferral_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExternalLabReferral_state_chk" CHECK (
    ("status" = 'REFERRED' AND "resultSummary" IS NULL AND "resultReceivedAt" IS NULL AND "resultReceivedByEmployeeId" IS NULL AND "reviewedByEmployeeId" IS NULL AND "reviewedAt" IS NULL AND "cancelledAt" IS NULL AND "cancelledByEmployeeId" IS NULL AND "cancellationReason" IS NULL)
    OR
    ("status" = 'RESULT_RECEIVED' AND "resultSummary" IS NOT NULL AND length(btrim("resultSummary")) > 0 AND "resultReceivedAt" IS NOT NULL AND "resultReceivedByEmployeeId" IS NOT NULL AND "reviewedByEmployeeId" IS NULL AND "reviewedAt" IS NULL AND "cancelledAt" IS NULL AND "cancelledByEmployeeId" IS NULL AND "cancellationReason" IS NULL)
    OR
    ("status" = 'REVIEWED' AND "resultSummary" IS NOT NULL AND length(btrim("resultSummary")) > 0 AND "resultReceivedAt" IS NOT NULL AND "resultReceivedByEmployeeId" IS NOT NULL AND "reviewedByEmployeeId" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "cancelledAt" IS NULL AND "cancelledByEmployeeId" IS NULL AND "cancellationReason" IS NULL)
    OR
    ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "cancelledByEmployeeId" IS NOT NULL AND "cancellationReason" IS NOT NULL AND length(btrim("cancellationReason")) > 0 AND "reviewedByEmployeeId" IS NULL AND "reviewedAt" IS NULL)
  )
);

ALTER TABLE "LabOrder"
  ALTER COLUMN "encounterId" DROP NOT NULL,
  ALTER COLUMN "orderedByEmployeeId" DROP NOT NULL,
  ADD COLUMN "externalIntakeId" TEXT;

CREATE UNIQUE INDEX "LabOrder_externalIntakeId_key" ON "LabOrder"("externalIntakeId");
CREATE INDEX "PatientRecordTypeHistory_patientId_changedAt_idx" ON "PatientRecordTypeHistory"("patientId", "changedAt");
CREATE INDEX "PatientRecordTypeHistory_changedByEmployeeId_changedAt_idx" ON "PatientRecordTypeHistory"("changedByEmployeeId", "changedAt");
CREATE UNIQUE INDEX "ExternalLabIntake_intakeReference_key" ON "ExternalLabIntake"("intakeReference");
CREATE INDEX "ExternalLabIntake_patientId_createdAt_idx" ON "ExternalLabIntake"("patientId", "createdAt");
CREATE INDEX "ExternalLabIntake_createdByEmployeeId_createdAt_idx" ON "ExternalLabIntake"("createdByEmployeeId", "createdAt");
CREATE UNIQUE INDEX "ExternalLabReferral_referralReference_key" ON "ExternalLabReferral"("referralReference");
CREATE UNIQUE INDEX "ExternalLabReferral_consentId_key" ON "ExternalLabReferral"("consentId");
CREATE INDEX "ExternalLabReferral_encounterId_referredAt_idx" ON "ExternalLabReferral"("encounterId", "referredAt");
CREATE INDEX "ExternalLabReferral_status_referredAt_idx" ON "ExternalLabReferral"("status", "referredAt");
CREATE INDEX "ExternalLabReferral_resultReceivedByEmployeeId_resultReceivedAt_idx" ON "ExternalLabReferral"("resultReceivedByEmployeeId", "resultReceivedAt");
CREATE INDEX "ExternalLabReferral_reviewedByEmployeeId_reviewedAt_idx" ON "ExternalLabReferral"("reviewedByEmployeeId", "reviewedAt");

ALTER TABLE "LabOrder"
  ADD CONSTRAINT "LabOrder_origin_consistency_chk" CHECK (
    ("encounterId" IS NOT NULL AND "externalIntakeId" IS NULL AND "orderedByEmployeeId" IS NOT NULL)
    OR
    ("encounterId" IS NULL AND "externalIntakeId" IS NOT NULL AND "orderedByEmployeeId" IS NULL)
  );

ALTER TABLE "PatientRecordTypeHistory"
  ADD CONSTRAINT "PatientRecordTypeHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PatientRecordTypeHistory_changedByEmployeeId_fkey" FOREIGN KEY ("changedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExternalLabIntake"
  ADD CONSTRAINT "ExternalLabIntake_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalLabIntake_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExternalLabReferral"
  ADD CONSTRAINT "ExternalLabReferral_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalLabReferral_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "PatientConsent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalLabReferral_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalLabReferral_resultReceivedByEmployeeId_fkey" FOREIGN KEY ("resultReceivedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalLabReferral_reviewedByEmployeeId_fkey" FOREIGN KEY ("reviewedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalLabReferral_cancelledByEmployeeId_fkey" FOREIGN KEY ("cancelledByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LabOrder"
  ADD CONSTRAINT "LabOrder_externalIntakeId_fkey" FOREIGN KEY ("externalIntakeId") REFERENCES "ExternalLabIntake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- An external referral's consent must belong to the same Patient as the
-- Encounter and must be a granted, specifically scoped data-sharing consent.
CREATE FUNCTION "enforce_external_lab_referral_consent"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_patient_id TEXT;
  v_consent_patient_id TEXT;
  v_consent_type "PatientConsentType";
  v_decision "PatientConsentDecision";
BEGIN
  SELECT "patientId" INTO v_patient_id FROM "Encounter" WHERE "id" = NEW."encounterId";
  SELECT "patientId", "consentType", "decision"
    INTO v_consent_patient_id, v_consent_type, v_decision
    FROM "PatientConsent" WHERE "id" = NEW."consentId";
  IF v_patient_id IS NULL OR v_patient_id IS DISTINCT FROM v_consent_patient_id
     OR v_consent_type IS DISTINCT FROM 'EXTERNAL_DIAGNOSTIC_DATA_SHARING'::"PatientConsentType"
     OR v_decision IS DISTINCT FROM 'GRANTED'::"PatientConsentDecision" THEN
    RAISE EXCEPTION 'External laboratory referral requires matching granted diagnostic data-sharing consent'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ExternalLabReferral_consent_guard_trg"
BEFORE INSERT OR UPDATE OF "encounterId", "consentId" ON "ExternalLabReferral"
FOR EACH ROW EXECUTE FUNCTION "enforce_external_lab_referral_consent"();

-- Radiology preparation is separately attributable from the execution itself.
ALTER TABLE "RadiologyExam"
  ADD COLUMN "preparationInstructionsSnapshot" TEXT,
  ADD COLUMN "preparationStatus" "RadiologyExamPreparationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "preparationNotes" VARCHAR(1000),
  ADD COLUMN "preparationCheckedByEmployeeId" TEXT,
  ADD COLUMN "preparationCheckedAt" TIMESTAMPTZ(3);

ALTER TABLE "RadiologyExam"
  ADD CONSTRAINT "RadiologyExam_preparation_state_chk" CHECK (
    ("preparationStatus" = 'PENDING' AND "preparationCheckedByEmployeeId" IS NULL AND "preparationCheckedAt" IS NULL)
    OR
    ("preparationStatus" IN ('CONFIRMED', 'NOT_REQUIRED') AND "preparationCheckedByEmployeeId" IS NOT NULL AND "preparationCheckedAt" IS NOT NULL)
    OR
    ("preparationStatus" = 'ISSUE_REPORTED' AND "preparationCheckedByEmployeeId" IS NOT NULL AND "preparationCheckedAt" IS NOT NULL AND "preparationNotes" IS NOT NULL AND length(btrim("preparationNotes")) > 0)
  );

ALTER TABLE "RadiologyExam"
  ADD CONSTRAINT "RadiologyExam_preparationCheckedByEmployeeId_fkey" FOREIGN KEY ("preparationCheckedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "RadiologyExam_preparationCheckedByEmployeeId_preparationCheckedAt_idx" ON "RadiologyExam"("preparationCheckedByEmployeeId", "preparationCheckedAt");

ALTER TABLE "IdentityVerification"
  ADD COLUMN "radiologyExamId" TEXT;
ALTER TABLE "IdentityVerification"
  ADD CONSTRAINT "IdentityVerification_radiologyExamId_fkey" FOREIGN KEY ("radiologyExamId") REFERENCES "RadiologyExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "IdentityVerification_radiologyExamId_verifiedAt_idx" ON "IdentityVerification"("radiologyExamId", "verifiedAt");

-- Keep external patient records short-lived and isolated: no account, encounter,
-- family relationship, or full clinical history is created by the intake route.

-- Positive/declined exam-day screening requires a documented Radiologist decision.
CREATE TYPE "RadiologyPregnancyReviewDecision" AS ENUM ('AUTHORIZE_AFTER_REVIEW', 'DEFER_EXAM');
ALTER TABLE "RadiologyPregnancyScreening"
  ADD COLUMN "reviewDecision" "RadiologyPregnancyReviewDecision",
  ADD COLUMN "reviewNotes" VARCHAR(1000),
  ADD COLUMN "reviewedByEmployeeId" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMPTZ(3);
ALTER TABLE "RadiologyPregnancyScreening"
  ADD CONSTRAINT "RadiologyPregnancyScreening_review_state_chk" CHECK (
    ("reviewDecision" IS NULL AND "reviewedByEmployeeId" IS NULL AND "reviewedAt" IS NULL AND "reviewNotes" IS NULL)
    OR
    ("result" IN ('POSITIVE', 'DECLINED') AND "reviewDecision" IS NOT NULL AND "reviewedByEmployeeId" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "reviewNotes" IS NOT NULL AND length(btrim("reviewNotes")) > 0)
  ),
  ADD CONSTRAINT "RadiologyPregnancyScreening_reviewedByEmployeeId_fkey" FOREIGN KEY ("reviewedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "RadiologyPregnancyScreening_reviewedByEmployeeId_reviewedAt_idx"
  ON "RadiologyPregnancyScreening"("reviewedByEmployeeId", "reviewedAt");


-- A diagnostic-only patient record is an intake stub, not a clinic account or
-- longitudinal clinical identity. It must be explicitly converted after a
-- Reception identity re-check before it can enter normal clinic workflows.
CREATE FUNCTION "enforce_full_patient_record_link"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_patient_id TEXT;
  v_record_type "PatientRecordType";
BEGIN
  IF TG_TABLE_NAME = 'PatientRelationship' THEN
    FOREACH v_patient_id IN ARRAY ARRAY[NEW."patientId", NEW."relatedPatientId"] LOOP
      SELECT "recordType" INTO v_record_type FROM "Patient" WHERE "id" = v_patient_id;
      IF v_record_type = 'DIAGNOSTIC_ONLY' THEN
        RAISE EXCEPTION 'Diagnostic-only patient records cannot be linked to family relationships'
          USING ERRCODE = '23514';
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  v_patient_id := NEW."patientId";
  IF v_patient_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT "recordType" INTO v_record_type FROM "Patient" WHERE "id" = v_patient_id;
  IF v_record_type = 'DIAGNOSTIC_ONLY' THEN
    RAISE EXCEPTION 'Diagnostic-only patient records must be converted before entering clinic workflows'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Appointment_full_patient_record_guard_trg"
BEFORE INSERT OR UPDATE OF "patientId" ON "Appointment"
FOR EACH ROW EXECUTE FUNCTION "enforce_full_patient_record_link"();
CREATE TRIGGER "QueueEntry_full_patient_record_guard_trg"
BEFORE INSERT OR UPDATE OF "patientId" ON "QueueEntry"
FOR EACH ROW EXECUTE FUNCTION "enforce_full_patient_record_link"();
CREATE TRIGGER "Encounter_full_patient_record_guard_trg"
BEFORE INSERT OR UPDATE OF "patientId" ON "Encounter"
FOR EACH ROW EXECUTE FUNCTION "enforce_full_patient_record_link"();
CREATE TRIGGER "PatientAccount_full_patient_record_guard_trg"
BEFORE INSERT OR UPDATE OF "patientId" ON "PatientAccount"
FOR EACH ROW EXECUTE FUNCTION "enforce_full_patient_record_link"();
CREATE TRIGGER "PatientRelationship_full_patient_record_guard_trg"
BEFORE INSERT OR UPDATE OF "patientId", "relatedPatientId" ON "PatientRelationship"
FOR EACH ROW EXECUTE FUNCTION "enforce_full_patient_record_link"();

-- Once a record is marked FULL it may not be downgraded to a diagnostic-only
-- stub. The supported transition is DIAGNOSTIC_ONLY -> FULL after identity review.
CREATE FUNCTION "enforce_patient_record_type_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."recordType" = 'FULL' AND NEW."recordType" = 'DIAGNOSTIC_ONLY' THEN
    RAISE EXCEPTION 'A full patient record cannot be downgraded to diagnostic-only'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Patient_record_type_transition_guard_trg"
BEFORE UPDATE OF "recordType" ON "Patient"
FOR EACH ROW EXECUTE FUNCTION "enforce_patient_record_type_transition"();

-- Prevent two active exams from occupying the same device/room at overlapping
-- instants. Existing data is checked before the constraint is installed.
CREATE EXTENSION IF NOT EXISTS btree_gist;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "RadiologyExam" a
    JOIN "RadiologyExam" b
      ON a."id" < b."id"
     AND a."resourceId" = b."resourceId"
     AND a."status" IN ('SCHEDULED', 'IN_PROGRESS')
     AND b."status" IN ('SCHEDULED', 'IN_PROGRESS')
     AND a."scheduledStartsAt" IS NOT NULL
     AND a."scheduledEndsAt" IS NOT NULL
     AND b."scheduledStartsAt" IS NOT NULL
     AND b."scheduledEndsAt" IS NOT NULL
     AND tstzrange(a."scheduledStartsAt", a."scheduledEndsAt", '[)')
         && tstzrange(b."scheduledStartsAt", b."scheduledEndsAt", '[)')
  ) THEN
    RAISE EXCEPTION 'Existing radiology schedules contain overlapping active resource bookings; resolve them before applying this migration'
      USING ERRCODE = '23P01';
  END IF;
END;
$$;
ALTER TABLE "RadiologyExam"
  ADD CONSTRAINT "RadiologyExam_schedule_window_chk" CHECK (
    ("resourceId" IS NULL AND "scheduledStartsAt" IS NULL AND "scheduledEndsAt" IS NULL)
    OR
    ("resourceId" IS NOT NULL AND "scheduledStartsAt" IS NOT NULL AND "scheduledEndsAt" IS NOT NULL AND "scheduledStartsAt" < "scheduledEndsAt")
  ),
  ADD CONSTRAINT "RadiologyExam_resource_no_overlap_excl"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("scheduledStartsAt", "scheduledEndsAt", '[)') WITH &&
  )
  WHERE (
    "resourceId" IS NOT NULL
    AND "scheduledStartsAt" IS NOT NULL
    AND "scheduledEndsAt" IS NOT NULL
    AND "status" IN ('SCHEDULED', 'IN_PROGRESS')
  );
