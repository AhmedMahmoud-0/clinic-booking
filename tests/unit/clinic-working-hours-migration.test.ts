import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  resolve(
    process.cwd(),
    "prisma/migrations/20261108000000_add_clinic_working_hours/migration.sql",
  ),
  "utf8",
);

describe("Phase 4B1 clinic working-hours migration contract", () => {
  it("creates weekly clinic-hour windows using the existing weekday enum", () => {
    expect(migrationSql).toContain('CREATE TABLE "ClinicWeeklySchedule"');
    expect(migrationSql).toContain('"weekday" "Weekday" NOT NULL');
    expect(migrationSql).toContain('"startMinuteOfDay" INTEGER NOT NULL');
    expect(migrationSql).toContain('"endMinuteOfDay" INTEGER NOT NULL');
  });

  it("validates minute-of-day and effective-date ranges", () => {
    expect(migrationSql).toContain('"ClinicWeeklySchedule_minutes_range_chk"');
    expect(migrationSql).toContain('"startMinuteOfDay" >= 0');
    expect(migrationSql).toContain('"endMinuteOfDay" <= 1440');
    expect(migrationSql).toContain('"ClinicWeeklySchedule_effective_dates_chk"');
  });

  it("prevents overlapping active weekly intervals for the same weekday and date range", () => {
    expect(migrationSql).toContain('"ClinicWeeklySchedule_no_overlap"');
    expect(migrationSql).toContain('daterange("effectiveFrom", "effectiveUntil", \'[]\') WITH &&');
    expect(migrationSql).toContain('int4range("startMinuteOfDay", "endMinuteOfDay", \'[)\') WITH &&');
    expect(migrationSql).toContain('WHERE ("isActive" = TRUE)');
  });

  it("creates timezone-aware blocked and extra-hours exception windows", () => {
    expect(migrationSql).toContain('CREATE TABLE "ClinicScheduleException"');
    expect(migrationSql).toContain('"type" "ScheduleExceptionType" NOT NULL');
    expect(migrationSql).toContain('"startsAt" TIMESTAMPTZ(3) NOT NULL');
    expect(migrationSql).toContain('"endsAt" TIMESTAMPTZ(3) NOT NULL');
    expect(migrationSql).toContain('"ClinicScheduleException_time_range_chk"');
  });

  it("prevents exception windows from overlapping and retains creator referential integrity", () => {
    expect(migrationSql).toContain('"ClinicScheduleException_no_overlap"');
    expect(migrationSql).toContain('tstzrange("startsAt", "endsAt", \'[)\') WITH &&');
    expect(migrationSql).toContain('REFERENCES "Employee"("id")');
    expect(migrationSql).toContain('ON DELETE SET NULL');
  });

  it("does not seed assumed opening hours or rewrite existing doctor and appointment data", () => {
    expect(migrationSql).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migrationSql).not.toMatch(/\bUPDATE\s+"(?:DoctorWeeklySchedule|Appointment)"\b/i);
    expect(migrationSql).not.toMatch(/\bDELETE\s+FROM\s+"(?:DoctorWeeklySchedule|Appointment)"\b/i);
  });
});
