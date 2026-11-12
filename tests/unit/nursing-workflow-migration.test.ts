import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "prisma/migrations/20261110210000_nursing_task_and_vital_sign_workflow/migration.sql"), "utf8");

describe("Nursing task and VitalSign migration contract", () => {
  it("creates only the approved task type and lifecycle enums", () => {
    expect(migration).toContain('CREATE TYPE "NursingTaskType" AS ENUM');
    expect(migration).toContain('CREATE TYPE "NursingTaskStatus" AS ENUM');
  });
  it("creates NursingTask with the required assignment and lifecycle fields", () => {
    expect(migration).toContain('CREATE TABLE "NursingTask"');
    expect(migration).toContain('"assignedToEmployeeId" TEXT NOT NULL');
    expect(migration).toContain('"createdByEmployeeId" TEXT NOT NULL');
    expect(migration).toContain('"escalationNote" VARCHAR(1000)');
    expect(migration).toContain('"cancellationNote" VARCHAR(1000)');
    expect(migration).toContain('length(btrim("cancellationNote")) > 0');
  });
  it("adds a nullable link from VitalSign without rewriting historical rows", () => {
    expect(migration).toContain('ALTER TABLE "VitalSign" ADD COLUMN "nursingTaskId" TEXT');
    expect(migration).toContain("Historical rows are intentionally not backfilled or rewritten");
    expect(migration).not.toMatch(/UPDATE\s+"VitalSign"/i);
  });
  it("indexes task assignment, Encounter status, and task-linked measurements", () => {
    expect(migration).toContain('NursingTask_assignedToEmployeeId_status_dueAt_createdAt_idx');
    expect(migration).toContain('NursingTask_encounterId_status_createdAt_idx');
    expect(migration).toContain('VitalSign_nursingTaskId_measuredAt_idx');
  });
  it("restricts deletes for clinical records and employee audit actors", () => {
    expect(migration).toContain('REFERENCES "Encounter"("id") ON DELETE RESTRICT');
    expect(migration).toContain('REFERENCES "Employee"("id") ON DELETE RESTRICT');
    expect(migration).toContain('REFERENCES "NursingTask"("id") ON DELETE RESTRICT');
  });
  it("does not drop, truncate, or delete existing data", () => {
    expect(migration).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i);
  });
});
