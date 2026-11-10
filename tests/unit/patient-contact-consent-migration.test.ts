import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(join(process.cwd(), "prisma/migrations/20261108030000_patient_contacts_and_consents/migration.sql"), "utf8");

describe("patient contact and consent migration contract", () => {
  it("adds contact activity without dropping existing contact rows", () => {
    expect(migrationSql).toContain('ALTER TABLE "PatientContact"');
    expect(migrationSql).toContain('ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT TRUE');
    expect(migrationSql).toContain("PatientContact_inactive_not_primary_ck");
    expect(migrationSql).not.toMatch(/DELETE FROM\s+"PatientContact"/i);
  });
  it("creates dedicated address and emergency-contact records", () => {
    expect(migrationSql).toContain('CREATE TABLE "PatientAddress"');
    expect(migrationSql).toContain('CREATE TABLE "PatientEmergencyContact"');
  });
  it("creates append-only patient consent events", () => {
    expect(migrationSql).toContain('CREATE TABLE "PatientConsent"');
    expect(migrationSql).toContain('CREATE TRIGGER "PatientConsent_append_only_trg"');
  });
  it("validates verified guardian relationship before guardian consent", () => {
    expect(migrationSql).toContain('CREATE TRIGGER "PatientConsent_validate_signer_trg"');
    expect(migrationSql).toContain('relationship."guardianVerifiedAt" IS NOT NULL');
    expect(migrationSql).toContain('relationship."guardianVerifiedByEmployeeId" IS NOT NULL');
    expect(migrationSql).toContain("An adult patient must sign their own consent.");
    expect(migrationSql).toContain("A minor patient consent must be signed by a verified legal guardian.");
    expect(migrationSql).toContain("Africa/Cairo");
  });
  it("prevents multiple active primary addresses", () => expect(migrationSql).toContain('WHERE "isPrimary" = TRUE AND "isActive" = TRUE'));
  it("prevents multiple active primary emergency contacts", () => expect(migrationSql).toContain('"PatientEmergencyContact_one_primary_uq"'));
  it("keeps patient and employee foreign keys restrictive for consent history", () => {
    expect(migrationSql).toContain('"PatientConsent_patientId_fkey"');
    expect(migrationSql).toContain('"PatientConsent_recordedByEmployeeId_fkey"');
    expect(migrationSql).toContain('ON DELETE RESTRICT');
  });
});
