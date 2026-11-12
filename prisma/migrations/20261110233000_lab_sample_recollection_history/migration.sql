-- MERUNO Update 67 — preserve rejected specimen history while allowing a new collection.
-- The new snapshot records the specimen type selected by the ordered test at collection time.

ALTER TABLE "LabSample"
  ADD COLUMN "specimenTypeSnapshot" VARCHAR(100);

-- Backfill existing synthetic/demo samples from their linked test without changing
-- any status, timestamp, result, or audit record. A sample is created per order item.
UPDATE "LabSample" AS sample
SET "specimenTypeSnapshot" = source."specimenType"
FROM (
  SELECT DISTINCT ON (sample_item."sampleId")
    sample_item."sampleId",
    lab_test."specimenType"
  FROM "LabSampleItem" AS sample_item
  JOIN "LabOrderItem" AS order_item
    ON order_item."id" = sample_item."orderItemId"
  JOIN "LabTest" AS lab_test
    ON lab_test."id" = order_item."labTestId"
  ORDER BY sample_item."sampleId", sample_item."createdAt" DESC, sample_item."id" DESC
) AS source
WHERE source."sampleId" = sample."id";

-- Keep rejected sample/sample-item history. A LabOrderItem may be linked to a
-- subsequent sample after a rejection; the service serializes recollection by
-- locking the LabOrderItem and checking that its latest sample is REJECTED.
DROP INDEX IF EXISTS "LabSampleItem_orderItemId_key";

CREATE INDEX "LabSampleItem_orderItemId_createdAt_idx"
  ON "LabSampleItem"("orderItemId", "createdAt");

-- This migration is additive for the clinical history. No sample, order item,
-- result, patient, or audit rows are deleted or reset.
