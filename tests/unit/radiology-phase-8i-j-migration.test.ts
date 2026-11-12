import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20261111020000_radiology_execution_reporting_and_external_results/migration.sql"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("Phase 8I–8J migration safety and invariants", () => {
  it("does not reset, delete, or drop existing database objects or data", () => {
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|TYPE|SCHEMA|DATABASE|COLUMN)\b/i);
    expect(migration).not.toMatch(/\bTRUNCATE\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
  it("adds a bounded critical flag to internal reports with a required reason", () => {
    expect(migration).toContain('ADD COLUMN "isCritical" BOOLEAN NOT NULL DEFAULT false');
    expect(migration).toContain('RadiologyReport_critical_state_chk');
    expect(schema).toContain('isCritical            Boolean               @default(false)');
    expect(schema).toContain('criticalReason        String?               @db.VarChar(1000)');
  });
  it("keeps incoming external radiology results separate from clinic-performed reports", () => {
    expect(migration).toContain('CREATE TABLE "ExternalRadiologyReferral"');
    expect(migration).toContain('ExternalRadiologyReferralStatus');
    expect(schema).toContain('model ExternalRadiologyReferral');
    expect(schema).toContain('externalRadiologyReferrals ExternalRadiologyReferral[]');
  });
  it("requires matching granted diagnostic data-sharing consent at the database boundary", () => {
    expect(migration).toContain('enforce_external_radiology_referral_consent');
    expect(migration).toContain('EXTERNAL_DIAGNOSTIC_DATA_SHARING');
    expect(migration).toContain("v_decision IS DISTINCT FROM 'GRANTED'");
  });
  it("enforces result receipt and Doctor review state consistency", () => {
    expect(migration).toContain('ExternalRadiologyReferral_result_state_chk');
    expect(migration).toContain('"status" = \'RESULT_RECEIVED\'');
    expect(migration).toContain('"status" = \'REVIEWED\'');
    expect(migration).toContain('"reviewedByEmployeeId" IS NOT NULL');
  });
});
