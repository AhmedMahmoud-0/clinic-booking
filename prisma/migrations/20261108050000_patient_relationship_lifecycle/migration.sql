-- Phase 5E-2: controlled correction and soft deactivation of family relationships.
-- Re-runnable DDL makes recovery safe if a local migration is interrupted.

ALTER TABLE "PatientRelationship"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "deactivatedByEmployeeId" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PatientRelationship_deactivatedByEmployeeId_fkey'
      AND conrelid = '"PatientRelationship"'::regclass
  ) THEN
    ALTER TABLE "PatientRelationship"
      ADD CONSTRAINT "PatientRelationship_deactivatedByEmployeeId_fkey"
      FOREIGN KEY ("deactivatedByEmployeeId")
      REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PatientRelationship_lifecycle_state_consistent'
      AND conrelid = '"PatientRelationship"'::regclass
  ) THEN
    ALTER TABLE "PatientRelationship"
      ADD CONSTRAINT "PatientRelationship_lifecycle_state_consistent"
      CHECK (
        ("isActive" = TRUE AND "deactivatedAt" IS NULL AND "deactivatedByEmployeeId" IS NULL)
        OR
        ("isActive" = FALSE AND "deactivatedAt" IS NOT NULL AND "deactivatedByEmployeeId" IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PatientRelationship_inactive_not_guardian'
      AND conrelid = '"PatientRelationship"'::regclass
  ) THEN
    ALTER TABLE "PatientRelationship"
      ADD CONSTRAINT "PatientRelationship_inactive_not_guardian"
      CHECK (
        "isActive" = TRUE
        OR (
          "isLegalGuardian" = FALSE
          AND "guardianVerifiedAt" IS NULL
          AND "guardianVerifiedByEmployeeId" IS NULL
          AND "guardianEvidenceType" IS NULL
          AND "guardianEvidenceAttachmentId" IS NULL
          AND "guardianVerificationLegacy" = FALSE
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PatientRelationship_deactivatedByEmployeeId_idx"
  ON "PatientRelationship"("deactivatedByEmployeeId");

CREATE INDEX IF NOT EXISTS "PatientRelationship_patientId_isActive_createdAt_idx"
  ON "PatientRelationship"("patientId", "isActive", "createdAt");

-- Deactivation is terminal in this increment. A relationship is never reactivated
-- in place; it remains as an immutable historical record.
CREATE OR REPLACE FUNCTION "prevent_patient_relationship_reactivation"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Patient family relationship rows are retained; deactivate instead of deleting.'
      USING ERRCODE = '23514';
  END IF;

  IF OLD."isActive" = FALSE AND NEW."isActive" = TRUE THEN
    RAISE EXCEPTION 'A deactivated patient relationship cannot be reactivated.'
      USING ERRCODE = '23514';
  END IF;

  IF OLD."isActive" = FALSE THEN
    RAISE EXCEPTION 'A deactivated patient relationship is immutable.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "PatientRelationship_lifecycle_immutable_trg" ON "PatientRelationship";
CREATE TRIGGER "PatientRelationship_lifecycle_immutable_trg"
  BEFORE UPDATE OR DELETE ON "PatientRelationship"
  FOR EACH ROW EXECUTE FUNCTION "prevent_patient_relationship_reactivation"();
