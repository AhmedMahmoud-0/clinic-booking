import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20261111010000_external_lab_intake_and_radiology_preparation/migration.sql"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("Phase 8F–8H migration safety and invariants", () => {
  it("does not reset or delete existing database objects or data", () => {
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|TYPE|SCHEMA|DATABASE)\b/i);
    expect(migration).not.toMatch(/\bTRUNCATE\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
  it("adds patient record type as a safe default for existing patients", () => {
    expect(migration).toContain('ADD COLUMN "recordType" "PatientRecordType" NOT NULL DEFAULT \'FULL\'');
    expect(schema).toContain("recordType    PatientRecordType     @default(FULL)");
  });
  it("keeps each lab order linked to exactly one internal or external origin", () => {
    expect(migration).toContain('LabOrder_origin_consistency_chk');
    expect(migration).toContain('"encounterId" IS NOT NULL AND "externalIntakeId" IS NULL');
    expect(migration).toContain('"encounterId" IS NULL AND "externalIntakeId" IS NOT NULL');
  });
  it("requires matching granted scoped consent for an external Doctor referral", () => {
    expect(migration).toContain("enforce_external_lab_referral_consent");
    expect(migration).toContain("EXTERNAL_DIAGNOSTIC_DATA_SHARING");
    expect(migration).toContain("v_decision IS DISTINCT FROM 'GRANTED'");
  });
  it("prevents diagnostic-only records from entering full patient workflows", () => {
    expect(migration).toContain('Appointment_full_patient_record_guard_trg');
    expect(migration).toContain('QueueEntry_full_patient_record_guard_trg');
    expect(migration).toContain('Encounter_full_patient_record_guard_trg');
    expect(migration).toContain('PatientAccount_full_patient_record_guard_trg');
    expect(migration).toContain('PatientRelationship_full_patient_record_guard_trg');
  });
  it("allows only the supported diagnostic-only to full record conversion", () => {
    expect(migration).toContain('Patient_record_type_transition_guard_trg');
    expect(migration).toContain("OLD.\"recordType\" = 'FULL' AND NEW.\"recordType\" = 'DIAGNOSTIC_ONLY'");
  });
  it("checks existing radiology overlaps before creating the exclusion constraint", () => {
    expect(migration).toContain("Existing radiology schedules contain overlapping active resource bookings");
    expect(migration).toContain("btree_gist");
    expect(migration).toContain("RadiologyExam_resource_no_overlap_excl");
    expect(migration).toContain("tstzrange(\"scheduledStartsAt\", \"scheduledEndsAt\", '[)') WITH &&");
  });
  it("requires radiology schedule resource and time fields to be consistently null or complete", () => {
    expect(migration).toContain("RadiologyExam_schedule_window_chk");
    expect(migration).toContain('"scheduledStartsAt" < "scheduledEndsAt"');
  });
  it("adds attributable radiology preparation and Radiologist pregnancy-review fields", () => {
    expect(migration).toContain('preparationCheckedByEmployeeId');
    expect(migration).toContain('RadiologyPregnancyScreening_review_state_chk');
    expect(migration).toContain('reviewedByEmployeeId');
  });
});
