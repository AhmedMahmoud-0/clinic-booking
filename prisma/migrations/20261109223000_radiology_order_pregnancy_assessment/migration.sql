-- Phase 7G — Persist the ordering Doctor's decision on whether formal X-ray
-- pregnancy screening is required. This is intentionally distinct from the
-- exam-day PregnancyScreeningResult captured on RadiologyExam.
-- Historical RadiologyOrderItem rows remain unchanged; new DIGITAL_XRAY items
-- must carry an attributed decision, while ULTRASOUND items must not.

CREATE TYPE "RadiologyOrderPregnancyAssessment" AS ENUM (
  'SCREENING_REQUIRED',
  'NOT_INDICATED'
);

ALTER TABLE "RadiologyOrderItem"
  ADD COLUMN "preOrderPregnancyAssessment" "RadiologyOrderPregnancyAssessment",
  ADD COLUMN "preOrderPregnancyAssessmentNotes" VARCHAR(1000),
  ADD COLUMN "preOrderPregnancyAssessedByEmployeeId" TEXT,
  ADD COLUMN "preOrderPregnancyAssessedAt" TIMESTAMPTZ(3);

ALTER TABLE "RadiologyOrderItem"
  ADD CONSTRAINT "RadiologyOrderItem_preorder_pregnancy_assessment_consistent_chk"
  CHECK (
    (
      "preOrderPregnancyAssessment" IS NULL
      AND "preOrderPregnancyAssessmentNotes" IS NULL
      AND "preOrderPregnancyAssessedByEmployeeId" IS NULL
      AND "preOrderPregnancyAssessedAt" IS NULL
    )
    OR
    (
      "preOrderPregnancyAssessment" = 'SCREENING_REQUIRED'
      AND "preOrderPregnancyAssessedByEmployeeId" IS NOT NULL
      AND "preOrderPregnancyAssessedAt" IS NOT NULL
    )
    OR
    (
      "preOrderPregnancyAssessment" = 'NOT_INDICATED'
      AND "preOrderPregnancyAssessedByEmployeeId" IS NOT NULL
      AND "preOrderPregnancyAssessedAt" IS NOT NULL
      AND "preOrderPregnancyAssessmentNotes" IS NOT NULL
      AND length(btrim("preOrderPregnancyAssessmentNotes")) > 0
    )
  );

ALTER TABLE "RadiologyOrderItem"
  ADD CONSTRAINT "RadiologyOrderItem_preorder_pregnancy_assessor_fkey"
  FOREIGN KEY ("preOrderPregnancyAssessedByEmployeeId")
  REFERENCES "Employee"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

CREATE INDEX "RadiologyOrderItem_preorder_pregnancy_assessor_idx"
  ON "RadiologyOrderItem"("preOrderPregnancyAssessedByEmployeeId", "preOrderPregnancyAssessedAt");

-- A DIGITAL_XRAY item must say whether formal screening is required. An
-- ultrasound item cannot carry this X-ray-only order-time decision. The
-- dedicated RadiologyPregnancyScreening record remains the separate
-- pre-examination workflow managed in Phase 8.
CREATE FUNCTION "enforce_radiology_order_item_preorder_pregnancy_assessment"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_modality "RadiologyModality";
  v_ordering_employee_id TEXT;
BEGIN
  SELECT radiology_procedure."modality", order_header."orderedByEmployeeId"
    INTO v_modality, v_ordering_employee_id
    FROM "RadiologyProcedure" AS radiology_procedure
    JOIN "RadiologyOrder" AS order_header
      ON order_header."id" = NEW."radiologyOrderId"
   WHERE radiology_procedure."id" = NEW."procedureId";

  IF v_modality = 'DIGITAL_XRAY' THEN
    IF NEW."preOrderPregnancyAssessment" IS NULL
       OR NEW."preOrderPregnancyAssessedByEmployeeId" IS NULL
       OR NEW."preOrderPregnancyAssessedByEmployeeId" IS DISTINCT FROM v_ordering_employee_id
       OR NEW."preOrderPregnancyAssessedAt" IS NULL THEN
      RAISE EXCEPTION 'An ordering-clinician pregnancy-screening decision must be recorded by the Doctor who authored the radiology order'
        USING ERRCODE = '23514';
    END IF;
    IF NEW."preOrderPregnancyAssessment" = 'NOT_INDICATED'
       AND length(btrim(coalesce(NEW."preOrderPregnancyAssessmentNotes", ''))) = 0 THEN
      RAISE EXCEPTION 'A reason is required when X-ray pregnancy screening is not indicated'
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_modality = 'ULTRASOUND' THEN
    IF NEW."preOrderPregnancyAssessment" IS NOT NULL
       OR NEW."preOrderPregnancyAssessmentNotes" IS NOT NULL
       OR NEW."preOrderPregnancyAssessedByEmployeeId" IS NOT NULL
       OR NEW."preOrderPregnancyAssessedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'The pre-order X-ray pregnancy assessment fields are not used for ultrasound items'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "RadiologyOrderItem_preorder_pregnancy_assessment_trg"
BEFORE INSERT OR UPDATE OF
  "procedureId",
  "preOrderPregnancyAssessment",
  "preOrderPregnancyAssessmentNotes",
  "preOrderPregnancyAssessedByEmployeeId",
  "preOrderPregnancyAssessedAt"
ON "RadiologyOrderItem"
FOR EACH ROW
EXECUTE FUNCTION "enforce_radiology_order_item_preorder_pregnancy_assessment"();
