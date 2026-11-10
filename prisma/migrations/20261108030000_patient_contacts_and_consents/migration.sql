-- Phase 5C: patient contacts, addresses, emergency contacts, and append-only consent history.
-- Additive only: existing PatientContact rows become active by default; no patient history is deleted.

ALTER TABLE "PatientContact"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "PatientContact"
  ADD CONSTRAINT "PatientContact_inactive_not_primary_ck" CHECK ("isActive" OR NOT "isPrimary");

CREATE TYPE "PatientAddressType" AS ENUM ('HOME', 'WORK', 'OTHER');
CREATE TYPE "PatientConsentType" AS ENUM (
  'PRIVACY_NOTICE',
  'PERSONAL_DATA_PROCESSING',
  'GENERAL_TREATMENT',
  'EMAIL_COMMUNICATION',
  'PHONE_COMMUNICATION'
);
CREATE TYPE "PatientConsentDecision" AS ENUM ('GRANTED', 'REFUSED', 'WITHDRAWN');
CREATE TYPE "PatientConsentCaptureMethod" AS ENUM ('WRITTEN', 'VERBAL');
CREATE TYPE "PatientConsentSignerType" AS ENUM ('PATIENT', 'LEGAL_GUARDIAN');

CREATE TABLE "PatientAddress" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "type" "PatientAddressType" NOT NULL DEFAULT 'HOME',
  "addressLine1" VARCHAR(180) NOT NULL,
  "addressLine2" VARCHAR(180),
  "district" VARCHAR(100),
  "city" VARCHAR(100) NOT NULL,
  "governorate" VARCHAR(100) NOT NULL,
  "postalCode" VARCHAR(20),
  "countryCode" CHAR(2) NOT NULL DEFAULT 'EG',
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PatientAddress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientAddress_line1_nonempty_ck" CHECK (length(btrim("addressLine1")) > 0),
  CONSTRAINT "PatientAddress_city_nonempty_ck" CHECK (length(btrim("city")) > 0),
  CONSTRAINT "PatientAddress_governorate_nonempty_ck" CHECK (length(btrim("governorate")) > 0),
  CONSTRAINT "PatientAddress_country_code_ck" CHECK ("countryCode" ~ '^[A-Z]{2}$'),
  CONSTRAINT "PatientAddress_inactive_not_primary_ck" CHECK ("isActive" OR NOT "isPrimary")
);

CREATE TABLE "PatientEmergencyContact" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "fullName" VARCHAR(180) NOT NULL,
  "relationshipType" "PatientRelationshipType" NOT NULL,
  "phone" VARCHAR(30) NOT NULL,
  "normalizedPhone" VARCHAR(15) NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PatientEmergencyContact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientEmergencyContact_name_nonempty_ck" CHECK (length(btrim("fullName")) > 0),
  CONSTRAINT "PatientEmergencyContact_phone_length_ck" CHECK (char_length("normalizedPhone") BETWEEN 7 AND 15),
  CONSTRAINT "PatientEmergencyContact_inactive_not_primary_ck" CHECK ("isActive" OR NOT "isPrimary")
);

CREATE TABLE "PatientConsent" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "consentType" "PatientConsentType" NOT NULL,
  "decision" "PatientConsentDecision" NOT NULL,
  "captureMethod" "PatientConsentCaptureMethod" NOT NULL,
  "documentVersion" VARCHAR(40) NOT NULL,
  "signerPatientId" TEXT NOT NULL,
  "signerType" "PatientConsentSignerType" NOT NULL,
  "signerNameSnapshot" VARCHAR(220) NOT NULL,
  "recordedByEmployeeId" TEXT NOT NULL,
  "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientConsent_document_version_nonempty_ck" CHECK (length(btrim("documentVersion")) > 0),
  CONSTRAINT "PatientConsent_signer_name_nonempty_ck" CHECK (length(btrim("signerNameSnapshot")) > 0),
  CONSTRAINT "PatientConsent_signer_type_ck" CHECK (
    ("signerType" = 'PATIENT' AND "signerPatientId" = "patientId") OR
    ("signerType" = 'LEGAL_GUARDIAN' AND "signerPatientId" <> "patientId")
  )
);

CREATE INDEX "PatientAddress_patientId_isActive_isPrimary_idx"
  ON "PatientAddress" ("patientId", "isActive", "isPrimary");
CREATE INDEX "PatientAddress_patientId_city_governorate_idx"
  ON "PatientAddress" ("patientId", "city", "governorate");
CREATE UNIQUE INDEX "PatientAddress_one_primary_uq"
  ON "PatientAddress" ("patientId") WHERE "isPrimary" = TRUE AND "isActive" = TRUE;

CREATE INDEX "PatientEmergencyContact_patientId_isActive_isPrimary_idx"
  ON "PatientEmergencyContact" ("patientId", "isActive", "isPrimary");
CREATE INDEX "PatientEmergencyContact_patientId_normalizedPhone_idx"
  ON "PatientEmergencyContact" ("patientId", "normalizedPhone");
CREATE UNIQUE INDEX "PatientEmergencyContact_one_primary_uq"
  ON "PatientEmergencyContact" ("patientId") WHERE "isPrimary" = TRUE AND "isActive" = TRUE;

CREATE INDEX "PatientConsent_patientId_consentType_recordedAt_idx"
  ON "PatientConsent" ("patientId", "consentType", "recordedAt" DESC);
CREATE INDEX "PatientConsent_signerPatientId_recordedAt_idx"
  ON "PatientConsent" ("signerPatientId", "recordedAt" DESC);
CREATE INDEX "PatientConsent_recordedByEmployeeId_recordedAt_idx"
  ON "PatientConsent" ("recordedByEmployeeId", "recordedAt" DESC);

ALTER TABLE "PatientAddress"
  ADD CONSTRAINT "PatientAddress_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientEmergencyContact"
  ADD CONSTRAINT "PatientEmergencyContact_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientConsent"
  ADD CONSTRAINT "PatientConsent_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientConsent"
  ADD CONSTRAINT "PatientConsent_signerPatientId_fkey"
  FOREIGN KEY ("signerPatientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientConsent"
  ADD CONSTRAINT "PatientConsent_recordedByEmployeeId_fkey"
  FOREIGN KEY ("recordedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A guardian may sign only when the existing, directed patient relationship was verified by staff.
CREATE FUNCTION "validate_patient_consent_signer"() RETURNS TRIGGER AS $$
DECLARE
  subject_date_of_birth DATE;
  subject_age INTEGER;
BEGIN
  SELECT "dateOfBirth"::DATE
    INTO subject_date_of_birth
    FROM "Patient"
    WHERE "id" = NEW."patientId" AND "isActive" = TRUE;

  IF subject_date_of_birth IS NULL THEN
    RAISE EXCEPTION 'Consent cannot be recorded when the patient date of birth is unknown or the patient is inactive.'
      USING ERRCODE = '23514';
  END IF;

  SELECT date_part(
    'year',
    age((CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Cairo')::DATE, subject_date_of_birth)
  )::INTEGER
    INTO subject_age;

  IF subject_age >= 18 THEN
    IF NEW."signerType" <> 'PATIENT' OR NEW."signerPatientId" <> NEW."patientId" THEN
      RAISE EXCEPTION 'An adult patient must sign their own consent.'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW."signerType" <> 'LEGAL_GUARDIAN' OR NEW."signerPatientId" = NEW."patientId" THEN
      RAISE EXCEPTION 'A minor patient consent must be signed by a verified legal guardian.'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM "PatientRelationship" relationship
      JOIN "Patient" guardian ON guardian."id" = relationship."relatedPatientId" AND guardian."isActive" = TRUE
      WHERE relationship."patientId" = NEW."patientId"
        AND relationship."relatedPatientId" = NEW."signerPatientId"
        AND relationship."isLegalGuardian" = TRUE
        AND relationship."guardianVerifiedAt" IS NOT NULL
        AND relationship."guardianVerifiedByEmployeeId" IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'A consent signer must be a previously verified legal guardian.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PatientConsent_validate_signer_trg"
  BEFORE INSERT ON "PatientConsent"
  FOR EACH ROW EXECUTE FUNCTION "validate_patient_consent_signer"();

-- Consent is an append-only event history. Correct or withdraw by inserting a new event.
CREATE FUNCTION "prevent_patient_consent_mutation"() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Patient consent history is append-only; insert a new consent event.'
    USING ERRCODE = '55000';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PatientConsent_append_only_trg"
  BEFORE UPDATE OR DELETE ON "PatientConsent"
  FOR EACH ROW EXECUTE FUNCTION "prevent_patient_consent_mutation"();
