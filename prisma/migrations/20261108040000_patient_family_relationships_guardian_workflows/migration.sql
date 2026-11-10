-- Phase 5E-1: patient family relationships and evidence-backed legal-guardian verification.
-- Additive only. Existing family relationships and legacy staff-verified guardian records are preserved.

-- This migration may be retried after a failed attempt. The failed attempt can
-- leave earlier PostgreSQL DDL statements committed, so create the enum safely.
DO $$
BEGIN
  CREATE TYPE "PatientGuardianEvidenceType" AS ENUM (
    'BIRTH_CERTIFICATE',
    'FAMILY_REGISTRY_EXTRACT',
    'COURT_ORDER',
    'CUSTODY_ORDER',
    'OTHER_OFFICIAL_DOCUMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

ALTER TABLE "PatientRelationship"
  ADD COLUMN IF NOT EXISTS "guardianEvidenceType" "PatientGuardianEvidenceType",
  ADD COLUMN IF NOT EXISTS "guardianEvidenceAttachmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "guardianVerificationLegacy" BOOLEAN NOT NULL DEFAULT FALSE;

-- Preserve already-verified legacy records with both new evidence fields NULL.
-- A dedicated marker distinguishes those pre-migration rows from all new verifications.
UPDATE "PatientRelationship"
SET "guardianVerificationLegacy" = TRUE
WHERE "isLegalGuardian" = TRUE
  AND "guardianEvidenceType" IS NULL
  AND "guardianEvidenceAttachmentId" IS NULL;

-- New verifications must carry evidence; only rows explicitly grandfathered above may omit it.
ALTER TABLE "PatientRelationship"
  DROP CONSTRAINT IF EXISTS "PatientRelationship_guardian_verification_consistent",
  ADD CONSTRAINT "PatientRelationship_guardian_verification_consistent"
  CHECK (
    (
      "isLegalGuardian" = FALSE
      AND "guardianVerifiedAt" IS NULL
      AND "guardianVerifiedByEmployeeId" IS NULL
      AND "guardianEvidenceType" IS NULL
      AND "guardianEvidenceAttachmentId" IS NULL
      AND "guardianVerificationLegacy" = FALSE
    )
    OR
    (
      "isLegalGuardian" = TRUE
      AND "guardianVerifiedAt" IS NOT NULL
      AND "guardianVerifiedByEmployeeId" IS NOT NULL
      AND (
        ("guardianVerificationLegacy" = TRUE AND "guardianEvidenceType" IS NULL AND "guardianEvidenceAttachmentId" IS NULL)
        OR
        ("guardianVerificationLegacy" = FALSE AND "guardianEvidenceType" IS NOT NULL AND "guardianEvidenceAttachmentId" IS NOT NULL)
      )
    )
  );

-- The legacy marker is migration-owned: a new insert or a normal update cannot create a grandfathered row.
CREATE OR REPLACE FUNCTION "prevent_new_legacy_guardian_verification_marker"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW."guardianVerificationLegacy" = TRUE THEN
    RAISE EXCEPTION 'New guardian verifications cannot use the legacy evidence exemption.'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."guardianVerificationLegacy" = FALSE
       AND NEW."guardianVerificationLegacy" = TRUE THEN
      RAISE EXCEPTION 'The legacy guardian evidence exemption cannot be enabled after migration.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "PatientRelationship_legacy_guardian_marker_protect_trg" ON "PatientRelationship";
CREATE TRIGGER "PatientRelationship_legacy_guardian_marker_protect_trg"
  BEFORE INSERT OR UPDATE OF "guardianVerificationLegacy"
  ON "PatientRelationship"
  FOR EACH ROW EXECUTE FUNCTION "prevent_new_legacy_guardian_verification_marker"();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PatientRelationship_guardianEvidenceAttachmentId_fkey'
      AND conrelid = '"PatientRelationship"'::regclass
  ) THEN
    ALTER TABLE "PatientRelationship"
      ADD CONSTRAINT "PatientRelationship_guardianEvidenceAttachmentId_fkey"
      FOREIGN KEY ("guardianEvidenceAttachmentId")
      REFERENCES "Attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "PatientRelationship_guardianEvidenceAttachmentId_key"
  ON "PatientRelationship"("guardianEvidenceAttachmentId");

CREATE INDEX IF NOT EXISTS "PatientRelationship_patientId_createdAt_idx"
  ON "PatientRelationship"("patientId", "createdAt");

-- A guardian evidence pointer must refer to a private patient document owned by the same subject patient.
CREATE OR REPLACE FUNCTION "validate_patient_guardian_evidence_attachment"() RETURNS TRIGGER AS $$
DECLARE
  evidence_patient_id TEXT;
  evidence_purpose "AttachmentPurpose";
BEGIN
  IF NEW."guardianEvidenceAttachmentId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "patientId", "purpose"
    INTO evidence_patient_id, evidence_purpose
    FROM "Attachment"
    WHERE "id" = NEW."guardianEvidenceAttachmentId";

  IF evidence_patient_id IS DISTINCT FROM NEW."patientId"
     OR evidence_purpose IS DISTINCT FROM 'PATIENT_DOCUMENT'::"AttachmentPurpose" THEN
    RAISE EXCEPTION 'Legal-guardian evidence must be a patient document attached to the same patient record.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "PatientRelationship_guardian_evidence_attachment_trg" ON "PatientRelationship";
CREATE TRIGGER "PatientRelationship_guardian_evidence_attachment_trg"
  BEFORE INSERT OR UPDATE OF "patientId", "guardianEvidenceAttachmentId"
  ON "PatientRelationship"
  FOR EACH ROW EXECUTE FUNCTION "validate_patient_guardian_evidence_attachment"();


-- Once referenced as guardian evidence, an attachment cannot be reassigned or reclassified.
CREATE OR REPLACE FUNCTION "protect_patient_guardian_evidence_attachment"() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PatientRelationship"
    WHERE "guardianEvidenceAttachmentId" = OLD."id"
  ) AND (
    NEW."patientId" IS DISTINCT FROM OLD."patientId"
    OR NEW."purpose" IS DISTINCT FROM OLD."purpose"
  ) THEN
    RAISE EXCEPTION 'An attachment referenced as legal-guardian evidence cannot be reassigned or reclassified.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Attachment_guardian_evidence_protect_trg" ON "Attachment";
CREATE TRIGGER "Attachment_guardian_evidence_protect_trg"
  BEFORE UPDATE OF "patientId", "purpose" ON "Attachment"
  FOR EACH ROW EXECUTE FUNCTION "protect_patient_guardian_evidence_attachment"();
