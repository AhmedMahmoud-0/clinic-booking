import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "prisma/migrations/20261108040000_patient_family_relationships_guardian_workflows/migration.sql"),
  "utf8",
);

describe("patient family relationship migration contract", () => {
  it("adds a bounded evidence-type catalog and evidence pointer", () => {
    expect(migrationSql).toContain('CREATE TYPE "PatientGuardianEvidenceType"');
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "guardianEvidenceType"');
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "guardianEvidenceAttachmentId" TEXT');
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "guardianVerificationLegacy" BOOLEAN NOT NULL DEFAULT FALSE');
  });

  it("preserves existing verified guardian rows without inventing evidence", () => {
    expect(migrationSql).toContain('"guardianVerifiedAt" IS NOT NULL');
    expect(migrationSql).toContain('"guardianVerifiedByEmployeeId" IS NOT NULL');
    expect(migrationSql).toContain('UPDATE "PatientRelationship"\nSET "guardianVerificationLegacy" = TRUE');
    expect(migrationSql).toContain('"guardianVerificationLegacy" = TRUE AND "guardianEvidenceType" IS NULL AND "guardianEvidenceAttachmentId" IS NULL');
    expect(migrationSql).toContain('"guardianVerificationLegacy" = FALSE AND "guardianEvidenceType" IS NOT NULL AND "guardianEvidenceAttachmentId" IS NOT NULL');
    expect(migrationSql).toContain('"PatientRelationship_legacy_guardian_marker_protect_trg"');
    expect(migrationSql).toContain('NEW."guardianVerificationLegacy" = TRUE');
  });

  it("requires complete evidence metadata for newly evidence-backed verifications", () => {
    expect(migrationSql).toContain('"guardianEvidenceType" IS NOT NULL AND "guardianEvidenceAttachmentId" IS NOT NULL');
    expect(migrationSql).toContain('PatientRelationship_guardian_verification_consistent');
  });

  it("can safely resume after a partially applied PostgreSQL migration", () => {
    expect(migrationSql).toContain("WHEN duplicate_object THEN NULL");
    expect(migrationSql).toContain('DROP CONSTRAINT IF EXISTS "PatientRelationship_guardian_verification_consistent"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "PatientRelationship_guardianEvidenceAttachmentId_key"');
    expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS "PatientRelationship_patientId_createdAt_idx"');
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION "prevent_new_legacy_guardian_verification_marker"()');
    expect(migrationSql).toContain('DROP TRIGGER IF EXISTS "PatientRelationship_legacy_guardian_marker_protect_trg"');
  });

  it("uses the same ascending patient-createdAt index declared by Prisma", () => {
    expect(migrationSql).toContain('ON "PatientRelationship"("patientId", "createdAt");');
    expect(migrationSql).not.toContain('"createdAt" DESC');
  });

  it("keeps the referenced evidence document protected from deletion", () => {
    expect(migrationSql).toContain('"PatientRelationship_guardianEvidenceAttachmentId_fkey"');
    expect(migrationSql).toContain('REFERENCES "Attachment"("id") ON DELETE RESTRICT');
    expect(migrationSql).toContain('"PatientRelationship_guardianEvidenceAttachmentId_key"');
  });

  it("enforces that evidence is a patient document belonging to the same patient", () => {
    expect(migrationSql).toContain('"PatientRelationship_guardian_evidence_attachment_trg"');
    expect(migrationSql).toContain("evidence_patient_id IS DISTINCT FROM NEW.\"patientId\"");
    expect(migrationSql).toContain('"Attachment_guardian_evidence_protect_trg"');
    expect(migrationSql).toContain("'PATIENT_DOCUMENT'::\"AttachmentPurpose\"");
    expect(migrationSql).not.toMatch(/DROP TABLE|DELETE FROM\s+"PatientRelationship"/i);
  });
});
