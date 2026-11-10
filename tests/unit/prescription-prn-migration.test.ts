import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "prisma/migrations/20261109110000_prescription_prn_safety_fields/migration.sql"),
  "utf8",
);

describe("Prescription PRN maximum-dose migration contract", () => {
  it("adds structured PRN fields to PrescriptionItem", () => {
    expect(migrationSql).toContain('ALTER TABLE "PrescriptionItem"');
    expect(migrationSql).toContain('ADD COLUMN "isPrn" BOOLEAN NOT NULL DEFAULT false');
    expect(migrationSql).toContain('ADD COLUMN "prnMaxQuantityPerDose" DECIMAL(10, 2)');
    expect(migrationSql).toContain('ADD COLUMN "prnMaxDoseUnit" VARCHAR(40)');
    expect(migrationSql).toContain('ADD COLUMN "prnMaxDosesPerDay" INTEGER');
  });
  it("requires positive maximum amount, non-empty unit, and a bounded daily frequency for PRN items", () => {
    expect(migrationSql).toContain('"prnMaxQuantityPerDose" > 0');
    expect(migrationSql).toContain('length(btrim("prnMaxDoseUnit")) > 0');
    expect(migrationSql).toContain('"prnMaxDosesPerDay" IS NOT NULL');
    expect(migrationSql).toContain('"prnMaxDosesPerDay" > 0');
  });
  it("requires all PRN maximum fields to be null for non-PRN items", () => {
    expect(migrationSql).toContain('"isPrn" = false');
    expect(migrationSql).toContain('"prnMaxQuantityPerDose" IS NULL');
    expect(migrationSql).toContain('"prnMaxDoseUnit" IS NULL');
    expect(migrationSql).toContain('"prnMaxDosesPerDay" IS NULL');
  });
  it("enforces the two mutually exclusive PRN states with one named check", () => {
    expect(migrationSql).toContain('"PrescriptionItem_prn_fields_consistent_chk"');
    expect(migrationSql).toContain('OR');
    expect(migrationSql).toContain('"isPrn" = true');
  });
  it("preserves existing rows through a false default without a destructive backfill", () => {
    expect(migrationSql).toContain('DEFAULT false');
    expect(migrationSql).not.toMatch(/DROP TABLE|DELETE FROM|TRUNCATE|DROP COLUMN/i);
  });
  it("does not alter prescription statuses, items, or historical rows", () => {
    expect(migrationSql).not.toMatch(/UPDATE\s+"PrescriptionItem"/i);
    expect(migrationSql).not.toMatch(/DELETE\s+FROM\s+"PrescriptionItem"/i);
    expect(migrationSql).not.toMatch(/ALTER TYPE\s+"PrescriptionStatus"/i);
  });
});


describe("Prescription draft uniqueness migration contract", () => {
  it("fails without mutating data when legacy duplicate drafts exist", () => {
    expect(migrationSql).toContain(`WHERE "status" = 'DRAFT'`);
    expect(migrationSql).toContain('HAVING COUNT(*) > 1');
    expect(migrationSql).toContain('RAISE EXCEPTION');
    expect(migrationSql).not.toMatch(/DELETE FROM\s+"Prescription"/i);
  });
  it("enforces one DRAFT prescription per Encounter in PostgreSQL", () => {
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "Prescription_one_draft_per_encounter_uq"');
    expect(migrationSql).toContain('ON "Prescription"("encounterId")');
    expect(migrationSql).toContain(`WHERE "status" = 'DRAFT'`);
  });
});
