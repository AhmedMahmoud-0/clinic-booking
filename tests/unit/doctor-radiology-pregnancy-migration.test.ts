import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "prisma/migrations/20261109223000_radiology_order_pregnancy_assessment/migration.sql"),
  "utf8",
);

describe("Radiology order-time pregnancy-screening decision migration contract", () => {
  it("adds a distinct order-time assessment enum, note, actor, and timestamp to radiology order items", () => {
    expect(migrationSql).toContain('CREATE TYPE "RadiologyOrderPregnancyAssessment" AS ENUM');
    expect(migrationSql).toContain('ALTER TABLE "RadiologyOrderItem"');
    expect(migrationSql).toContain('ADD COLUMN "preOrderPregnancyAssessment" "RadiologyOrderPregnancyAssessment"');
    expect(migrationSql).toContain('ADD COLUMN "preOrderPregnancyAssessmentNotes" VARCHAR(1000)');
    expect(migrationSql).toContain('ADD COLUMN "preOrderPregnancyAssessedByEmployeeId" TEXT');
    expect(migrationSql).toContain('ADD COLUMN "preOrderPregnancyAssessedAt" TIMESTAMPTZ(3)');
  });
  it("requires the assessment decision, actor, and timestamp to be present together", () => {
    expect(migrationSql).toContain('"preOrderPregnancyAssessment" IS NULL');
    expect(migrationSql).toContain('"preOrderPregnancyAssessedByEmployeeId" IS NULL');
    expect(migrationSql).toContain('"preOrderPregnancyAssessedAt" IS NULL');
    expect(migrationSql).toContain('"preOrderPregnancyAssessment" = \'SCREENING_REQUIRED\'');
  });
  it("uses an order-time decision enum instead of the exam-day screening result enum", () => {
    expect(migrationSql).toContain("CREATE TYPE \"RadiologyOrderPregnancyAssessment\"");
    expect(migrationSql).not.toContain('ADD COLUMN "preOrderPregnancyAssessment" "PregnancyScreeningResult"');
  });
  it("requires a reason when the physician records screening as not indicated", () => {
    expect(migrationSql).toContain('"preOrderPregnancyAssessment" = \'NOT_INDICATED\'');
    expect(migrationSql).toContain('length(btrim("preOrderPregnancyAssessmentNotes")) > 0');
  });
  it("links the assessment to the employee who recorded it", () => {
    expect(migrationSql).toContain('"RadiologyOrderItem_preorder_pregnancy_assessor_fkey"');
    expect(migrationSql).toContain('REFERENCES "Employee"("id")');
    expect(migrationSql).toContain('ON DELETE RESTRICT');
    expect(migrationSql).toContain('NEW."preOrderPregnancyAssessedByEmployeeId" IS DISTINCT FROM v_ordering_employee_id');
  });
  it("enforces an assessment for every new digital X-ray item", () => {
    expect(migrationSql).toContain("v_modality = 'DIGITAL_XRAY'");
    expect(migrationSql).toContain('An ordering-clinician pregnancy-screening decision must be recorded by the Doctor who authored the radiology order');
  });
  it("prevents ultrasound items from carrying the X-ray pre-order assessment fields", () => {
    expect(migrationSql).toContain("v_modality = 'ULTRASOUND'");
    expect(migrationSql).toContain('The pre-order X-ray pregnancy assessment fields are not used for ultrasound items');
  });
  it("installs a trigger on new and changed radiology order items", () => {
    expect(migrationSql).toContain('CREATE TRIGGER "RadiologyOrderItem_preorder_pregnancy_assessment_trg"');
    expect(migrationSql).toContain('BEFORE INSERT OR UPDATE OF');
    expect(migrationSql).toContain('ON "RadiologyOrderItem"');
  });
  it("is additive and does not delete, reset, or rewrite historical rows", () => {
    expect(migrationSql).not.toMatch(/DROP TABLE|DELETE FROM|TRUNCATE|DROP COLUMN/i);
    expect(migrationSql).not.toMatch(/UPDATE\s+"RadiologyOrderItem"/i);
    expect(migrationSql).toContain('-- Historical RadiologyOrderItem rows remain unchanged');
  });
});
