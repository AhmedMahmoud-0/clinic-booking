import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "prisma/migrations/20261108050000_patient_relationship_lifecycle/migration.sql"),
  "utf8",
);

describe("patient family relationship lifecycle migration contract", () => {
  it("adds soft-deactivation state and the employee actor reference", () => {
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE');
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMPTZ(3)');
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "deactivatedByEmployeeId" TEXT');
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3)');
    expect(migrationSql).toContain('REFERENCES "Employee"("id") ON DELETE RESTRICT');
    expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS "PatientRelationship_deactivatedByEmployeeId_idx"');
  });

  it("enforces consistent active and deactivated states", () => {
    expect(migrationSql).toContain('PatientRelationship_lifecycle_state_consistent');
    expect(migrationSql).toContain('PatientRelationship_inactive_not_guardian');
    expect(migrationSql).toContain('"deactivatedAt" IS NOT NULL AND "deactivatedByEmployeeId" IS NOT NULL');
  });

  it("prevents reactivation and mutation of deactivated relationship records", () => {
    expect(migrationSql).toContain('prevent_patient_relationship_reactivation');
    expect(migrationSql).toContain('A deactivated patient relationship cannot be reactivated.');
    expect(migrationSql).toContain('A deactivated patient relationship is immutable.');
    expect(migrationSql).toContain('Patient family relationship rows are retained; deactivate instead of deleting.');
    expect(migrationSql).toContain('BEFORE UPDATE OR DELETE ON "PatientRelationship"');
    expect(migrationSql).toContain('PatientRelationship_lifecycle_immutable_trg');
  });

  it("is additive and does not delete relationship, grant, patient, or audit data", () => {
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS');
    expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS');
    expect(migrationSql).not.toMatch(/DROP TABLE|DELETE FROM\s+"(?:PatientRelationship|PatientAccessGrant|Patient|AuditLog)"/i);
  });
});
