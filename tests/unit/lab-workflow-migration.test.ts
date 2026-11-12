import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "prisma/migrations/20261110233000_lab_sample_recollection_history/migration.sql"),
  "utf8",
);
const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("Lab sample recollection migration contract", () => {
  it("adds a collection-time specimen type snapshot", () => {
    expect(migration).toContain('ADD COLUMN "specimenTypeSnapshot" VARCHAR(100)');
    expect(schema).toContain("specimenTypeSnapshot  String?         @db.VarChar(100)");
  });
  it("backfills only the new specimen type snapshot from linked test data", () => {
    expect(migration).toContain('UPDATE "LabSample" AS sample');
    expect(migration).toContain('JOIN "LabOrderItem" AS order_item');
    expect(migration).toContain('JOIN "LabTest" AS lab_test');
    expect(migration).not.toMatch(/UPDATE\s+"LabOrderItem"|UPDATE\s+"LabResult"|UPDATE\s+"LabSampleItem"/i);
  });
  it("replaces one-to-one order-item sample linkage with historical one-to-many linkage", () => {
    expect(migration).toContain('DROP INDEX IF EXISTS "LabSampleItem_orderItemId_key"');
    expect(migration).toContain('CREATE INDEX "LabSampleItem_orderItemId_createdAt_idx"');
    expect(schema).toContain("sampleAssignments   LabSampleItem[]");
    expect(schema).not.toContain("orderItemId    String       @unique");
  });
  it("retains per-sample uniqueness for each order item", () => {
    expect(schema).toContain("@@unique([sampleId, orderItemId])");
  });
  it("does not delete, reset, truncate, or drop existing clinical rows", () => {
    expect(migration).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i);
  });
  it("creates a time-ordered lookup index for sample history", () => {
    expect(schema).toContain("@@index([orderItemId, createdAt])");
    expect(migration).toContain('ON "LabSampleItem"("orderItemId", "createdAt")');
  });
});
