-- A single DRAFT per Encounter is the editing workspace; issued/cancelled
-- prescriptions remain separate immutable history records. Fail safely if
-- unexpected duplicate drafts exist instead of deleting or merging history.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "Prescription"
      WHERE "status" = 'DRAFT'
      GROUP BY "encounterId"
      HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one draft Prescription per Encounter: duplicate DRAFT rows exist';
  END IF;
END;
$$;

-- Phase 7E — structured maximum-dose limits for as-needed (PRN) prescription items.
-- Existing items remain non-PRN by default and require no backfill or data rewrite.

ALTER TABLE "PrescriptionItem"
  ADD COLUMN "isPrn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "prnMaxQuantityPerDose" DECIMAL(10, 2),
  ADD COLUMN "prnMaxDoseUnit" VARCHAR(40),
  ADD COLUMN "prnMaxDosesPerDay" INTEGER;

ALTER TABLE "PrescriptionItem"
  ADD CONSTRAINT "PrescriptionItem_prn_fields_consistent_chk"
  CHECK (
    (
      "isPrn" = false
      AND "prnMaxQuantityPerDose" IS NULL
      AND "prnMaxDoseUnit" IS NULL
      AND "prnMaxDosesPerDay" IS NULL
    )
    OR
    (
      "isPrn" = true
      AND "prnMaxQuantityPerDose" IS NOT NULL
      AND "prnMaxQuantityPerDose" > 0
      AND "prnMaxDoseUnit" IS NOT NULL
      AND length(btrim("prnMaxDoseUnit")) > 0
      AND "prnMaxDosesPerDay" IS NOT NULL
      AND "prnMaxDosesPerDay" > 0
    )
  );

CREATE UNIQUE INDEX "Prescription_one_draft_per_encounter_uq"
  ON "Prescription"("encounterId")
  WHERE "status" = 'DRAFT';

