import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "prisma/migrations/20261108060000_guest_appointment_identity/migration.sql"),
  "utf8",
);

describe("guest appointment identity migration contract", () => {
  it("makes the existing Patient relation optional and adds a separate guest contact table", () => {
    expect(migrationSql).toContain('ALTER TABLE "Appointment" ALTER COLUMN "patientId" DROP NOT NULL');
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "GuestAppointmentContact"');
    expect(migrationSql).toContain('REFERENCES "Appointment"("id")');
    expect(migrationSql).toContain('REFERENCES "Patient"("id")');
  });

  it("stores only a management-token hash and constrains normalized phone values", () => {
    expect(migrationSql).toContain('"manageTokenHash" CHAR(64) NOT NULL');
    expect(migrationSql).toContain('"normalizedPhone" ~');
    expect(migrationSql).not.toContain('"manageToken" TEXT');
  });

  it("enforces pending-versus-linked guest resolution state", () => {
    expect(migrationSql).toContain('GuestAppointmentContact_resolution_state_chk');
    expect(migrationSql).toContain('Appointment_patient_or_unresolved_guest_chk');
    expect(migrationSql).toContain('Appointment_guest_patient_link_consistent_chk');
  });

  it("requires matching verified identity evidence for guest-to-patient linking", () => {
    expect(migrationSql).toContain('Appointment_guest_identity_verification_required_chk');
    expect(migrationSql).toContain('Appointment_guest_verified_check_requires_link_chk');
    expect(migrationSql).toContain("v.\"result\" = 'VERIFIED'");
    expect(migrationSql).toContain('v."performedByEmployeeId" = v_resolved_by_employee_id');
  });

  it("blocks queue and encounter work until the appointment is linked to the same Patient", () => {
    expect(migrationSql).toContain('QueueEntry_appointment_patient_identity_trg');
    expect(migrationSql).toContain('Encounter_appointment_patient_identity_trg');
    expect(migrationSql).toContain('Appointment_patient_required_for_progress_trg');
  });

  it("preserves existing records and leaves doctor, patient, and room exclusion constraints untouched", () => {
    expect(migrationSql).not.toMatch(/DROP TABLE|DELETE FROM\s+"(?:Appointment|Patient|GuestAppointmentContact|AuditLog)"/i);
    expect(migrationSql).not.toMatch(/DROP CONSTRAINT\s+"Appointment_(?:doctor|patient|room)_no_overlap"/i);

    // SQL line comments may wrap across lines. Compare their normalized text so
    // this contract does not depend on comment formatting or line wrapping.
    const normalizedMigrationComments = migrationSql
      .split("\n")
      .map((line) => line.replace(/^\s*--\s?/, ""))
      .join(" ")
      .replace(/\s+/g, " ");

    expect(normalizedMigrationComments).toContain(
      "The existing doctor and room overlap exclusions are unchanged",
    );
  });
});
