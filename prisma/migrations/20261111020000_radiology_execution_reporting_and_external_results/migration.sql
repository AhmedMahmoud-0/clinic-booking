-- Update 70 / Phase 8I-8J
-- Adds a controlled internal radiology report criticality flag and a separate
-- lifecycle for results received from an outside imaging provider.

CREATE TYPE "ExternalRadiologyReferralStatus" AS ENUM (
  'REFERRED',
  'RESULT_RECEIVED',
  'REVIEWED'
);

ALTER TABLE "RadiologyReport"
  ADD COLUMN "isCritical" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "criticalReason" VARCHAR(1000);

ALTER TABLE "RadiologyReport"
  ADD CONSTRAINT "RadiologyReport_critical_state_chk" CHECK (
    ("isCritical" = false AND "criticalReason" IS NULL)
    OR
    ("isCritical" = true AND "criticalReason" IS NOT NULL AND length(btrim("criticalReason")) > 0)
  );

CREATE TABLE "ExternalRadiologyReferral" (
  "id" TEXT NOT NULL,
  "referralReference" VARCHAR(30) NOT NULL,
  "encounterId" TEXT NOT NULL,
  "procedureName" VARCHAR(180) NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "externalFacilityName" VARCHAR(180) NOT NULL,
  "externalFacilityContact" VARCHAR(100),
  "status" "ExternalRadiologyReferralStatus" NOT NULL DEFAULT 'REFERRED',
  "consentId" TEXT NOT NULL,
  "resultFindings" TEXT,
  "resultImpression" TEXT,
  "resultRecommendations" TEXT,
  "resultPerformedAt" TIMESTAMPTZ(3),
  "resultReceivedAt" TIMESTAMPTZ(3),
  "resultReceivedByEmployeeId" TEXT,
  "reviewDecision" "DiagnosticReviewDecision",
  "reviewNotes" VARCHAR(1000),
  "reviewedByEmployeeId" TEXT,
  "reviewedAt" TIMESTAMPTZ(3),
  "createdByEmployeeId" TEXT NOT NULL,
  "referredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ExternalRadiologyReferral_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExternalRadiologyReferral_result_state_chk" CHECK (
    (
      "status" = 'REFERRED'
      AND "resultFindings" IS NULL
      AND "resultImpression" IS NULL
      AND "resultRecommendations" IS NULL
      AND "resultPerformedAt" IS NULL
      AND "resultReceivedAt" IS NULL
      AND "resultReceivedByEmployeeId" IS NULL
      AND "reviewDecision" IS NULL
      AND "reviewNotes" IS NULL
      AND "reviewedByEmployeeId" IS NULL
      AND "reviewedAt" IS NULL
    )
    OR
    (
      "status" = 'RESULT_RECEIVED'
      AND "resultFindings" IS NOT NULL AND length(btrim("resultFindings")) > 0
      AND "resultImpression" IS NOT NULL AND length(btrim("resultImpression")) > 0
      AND "resultReceivedAt" IS NOT NULL
      AND "resultReceivedByEmployeeId" IS NOT NULL
      AND "reviewDecision" IS NULL
      AND "reviewNotes" IS NULL
      AND "reviewedByEmployeeId" IS NULL
      AND "reviewedAt" IS NULL
    )
    OR
    (
      "status" = 'REVIEWED'
      AND "resultFindings" IS NOT NULL AND length(btrim("resultFindings")) > 0
      AND "resultImpression" IS NOT NULL AND length(btrim("resultImpression")) > 0
      AND "resultReceivedAt" IS NOT NULL
      AND "resultReceivedByEmployeeId" IS NOT NULL
      AND "reviewDecision" IS NOT NULL
      AND "reviewedByEmployeeId" IS NOT NULL
      AND "reviewedAt" IS NOT NULL
      AND ("reviewDecision" <> 'FOLLOW_UP_REQUIRED' OR ("reviewNotes" IS NOT NULL AND length(btrim("reviewNotes")) > 0))
    )
  )
);

CREATE UNIQUE INDEX "ExternalRadiologyReferral_referralReference_key"
  ON "ExternalRadiologyReferral"("referralReference");
CREATE UNIQUE INDEX "ExternalRadiologyReferral_consentId_key"
  ON "ExternalRadiologyReferral"("consentId");
CREATE INDEX "ExternalRadiologyReferral_encounterId_referredAt_idx"
  ON "ExternalRadiologyReferral"("encounterId", "referredAt");
CREATE INDEX "ExternalRadiologyReferral_status_referredAt_idx"
  ON "ExternalRadiologyReferral"("status", "referredAt");
CREATE INDEX "ExternalRadiologyReferral_resultReceivedByEmployeeId_resultReceivedAt_idx"
  ON "ExternalRadiologyReferral"("resultReceivedByEmployeeId", "resultReceivedAt");
CREATE INDEX "ExternalRadiologyReferral_reviewedByEmployeeId_reviewedAt_idx"
  ON "ExternalRadiologyReferral"("reviewedByEmployeeId", "reviewedAt");

ALTER TABLE "ExternalRadiologyReferral"
  ADD CONSTRAINT "ExternalRadiologyReferral_encounterId_fkey"
    FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalRadiologyReferral_consentId_fkey"
    FOREIGN KEY ("consentId") REFERENCES "PatientConsent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalRadiologyReferral_createdByEmployeeId_fkey"
    FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalRadiologyReferral_resultReceivedByEmployeeId_fkey"
    FOREIGN KEY ("resultReceivedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalRadiologyReferral_reviewedByEmployeeId_fkey"
    FOREIGN KEY ("reviewedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The referral must be linked to the same patient as the Encounter and a
-- granted external diagnostic data-sharing consent for that patient.
CREATE FUNCTION "enforce_external_radiology_referral_consent"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_patient_id TEXT;
  v_consent_patient_id TEXT;
  v_consent_type "PatientConsentType";
  v_decision "PatientConsentDecision";
BEGIN
  SELECT "patientId" INTO v_patient_id
    FROM "Encounter" WHERE "id" = NEW."encounterId";
  SELECT "patientId", "consentType", "decision"
    INTO v_consent_patient_id, v_consent_type, v_decision
    FROM "PatientConsent" WHERE "id" = NEW."consentId";
  IF v_patient_id IS NULL
     OR v_patient_id IS DISTINCT FROM v_consent_patient_id
     OR v_consent_type IS DISTINCT FROM 'EXTERNAL_DIAGNOSTIC_DATA_SHARING'::"PatientConsentType"
     OR v_decision IS DISTINCT FROM 'GRANTED'::"PatientConsentDecision" THEN
    RAISE EXCEPTION 'External radiology referral requires matching granted diagnostic data-sharing consent'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "ExternalRadiologyReferral_consent_guard_trg"
BEFORE INSERT OR UPDATE OF "encounterId", "consentId"
ON "ExternalRadiologyReferral"
FOR EACH ROW EXECUTE FUNCTION "enforce_external_radiology_referral_consent"();
