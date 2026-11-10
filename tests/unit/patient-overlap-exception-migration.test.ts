import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "prisma/migrations/20261109070000_audited_patient_overlap_exception/migration.sql"),
  "utf8",
);

describe("audited patient appointment overlap migration contract", () => {
  it("replaces only the patient overlap exclusion with an exact-pair guard", () => {
    expect(migrationSql).toContain('DROP CONSTRAINT "Appointment_patient_no_overlap"');
    expect(migrationSql).toContain('CREATE CONSTRAINT TRIGGER "Appointment_patient_no_overlap_guard_trg"');
    expect(migrationSql).toContain('USING ERRCODE = \'23P01\', CONSTRAINT = \'Appointment_patient_no_overlap\'');
    expect(migrationSql).not.toMatch(/DROP CONSTRAINT[^;]*Appointment_doctor_no_overlap/i);
    expect(migrationSql).not.toMatch(/DROP CONSTRAINT[^;]*Appointment_room_no_overlap/i);
  });

  it("requires one current-transaction audit row per exact overlapping appointment pair", () => {
    expect(migrationSql).toContain('CREATE TABLE "AppointmentPatientOverlapException"');
    expect(migrationSql).toContain('"conflictingAppointmentId"');
    expect(migrationSql).toContain('"transactionId" BIGINT NOT NULL DEFAULT txid_current()');
    expect(migrationSql).toContain('e."transactionId" = txid_current()');
    expect(migrationSql).toContain('e."appointmentStartsAt" = v_current."startsAt"');
    expect(migrationSql).toContain('e."conflictingEndsAt" = v_conflict."endsAt"');
    expect(migrationSql).toContain(`v_subject."source" NOT IN ('RECEPTION', 'PUBLIC_WEBSITE')`);
    expect(migrationSql).toContain(`gc."resolutionStatus" = 'LINKED'`);
    expect(migrationSql).toContain(`gc."resolvedByEmployeeId" = e."authorizedByEmployeeId"`);
  });

  it("binds each exception to an active Reception employee", () => {
    expect(migrationSql).toContain('e."status" = \'ACTIVE\'');
    expect(migrationSql).toContain('ra."status" = \'ACTIVE\'');
    expect(migrationSql).toContain('ra."role" = \'RECEPTION\'');
  });

  it("makes exception history append-only", () => {
    expect(migrationSql).toContain('CREATE TRIGGER "AppointmentPatientOverlapException_immutable_trg"');
    expect(migrationSql).toContain('BEFORE UPDATE OR DELETE ON "AppointmentPatientOverlapException"');
  });

  it("serializes scheduling writes by patient, including patient reassignment", () => {
    expect(migrationSql).toContain('ADD COLUMN "appointmentScheduleVersion" INTEGER NOT NULL DEFAULT 0');
    expect(migrationSql).toContain('UPDATE "Patient"');
    expect(migrationSql).toContain('"appointmentScheduleVersion" = "appointmentScheduleVersion" + 1');
    expect(migrationSql).toContain('CREATE TRIGGER "Appointment_patient_schedule_lock_trg"');
    expect(migrationSql).toContain('ARRAY[OLD."patientId", NEW."patientId"]');
    expect(migrationSql).toContain('WHEN NEW."patientId" IS NULL THEN ARRAY[]::TEXT[]');
  });

  it("prevents mutation and bulk truncation of immutable exception history", () => {
    expect(migrationSql).toContain('BEFORE UPDATE OR DELETE ON "AppointmentPatientOverlapException"');
    expect(migrationSql).toContain('BEFORE TRUNCATE ON "AppointmentPatientOverlapException"');
  });

  it("maps Prisma relation and index names to the migration's stable SQL names", () => {
    expect(migrationSql).toContain('"AppointmentPatientOverlapException_pair_transaction_key"');
    expect(migrationSql).toContain('"AppointmentPatientOverlapException_subject_fkey"');
    expect(migrationSql).toContain('"AppointmentPatientOverlapException_patient_createdAt_idx"');
  });

  it("keeps the doctor and room exclusion constraints intact", () => {
    expect(migrationSql).not.toMatch(/DROP CONSTRAINT[^;]*Appointment_doctor_no_overlap/i);
    expect(migrationSql).not.toMatch(/DROP CONSTRAINT[^;]*Appointment_room_no_overlap/i);
    expect(migrationSql).not.toMatch(/DROP TABLE|DELETE FROM\s+"(?:Appointment|Patient|Employee|AuditLog)"/i);
  });
});
