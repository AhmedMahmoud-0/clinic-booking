import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  resolve(
    process.cwd(),
    "prisma/migrations/20261108010000_enforce_doctor_schedule_clinic_coverage/migration.sql",
  ),
  "utf8",
);

describe("Phase 4B2 doctor schedule and clinic-hours integrity migration", () => {
  it("prevents overlapping one-off exceptions for the same doctor", () => {
    expect(migrationSql).toContain('"DoctorScheduleException_no_overlap"');
    expect(migrationSql).toContain('"doctorId" WITH =');
    expect(migrationSql).toContain('tstzrange("startsAt", "endsAt", \'[)\') WITH &&');
  });

  it("requires a doctor weekly interval to fit one active clinic interval", () => {
    expect(migrationSql).toContain("meruno_is_doctor_weekly_schedule_covered");
    expect(migrationSql).toContain('clinic."startMinuteOfDay" <= p_start_minute');
    expect(migrationSql).toContain('clinic."endMinuteOfDay" >= p_end_minute');
    expect(migrationSql).toContain('clinic."effectiveFrom" <= p_effective_from');
    expect(migrationSql).toContain('clinic."effectiveUntil" >= p_effective_until');
  });

  it("requires the clinic effective-date range to contain the full doctor range", () => {
    expect(migrationSql).toContain('(p_effective_until IS NULL AND clinic."effectiveUntil" IS NULL)');
    expect(migrationSql).toContain('clinic."effectiveUntil" >= p_effective_until');
  });

  it("uses Africa/Cairo wall time for doctor extra-hours matching", () => {
    expect(migrationSql).toContain("AT TIME ZONE 'Africa/Cairo'");
    expect(migrationSql).toContain("EXTRACT(ISODOW FROM local_start)");
    expect(migrationSql).toContain("date_trunc('minute', local_start)");
  });

  it("allows doctor extra hours only inside regular clinic hours or a clinic extra-hours exception", () => {
    expect(migrationSql).toContain('extra."type" = \'EXTRA_HOURS\'');
    expect(migrationSql).toContain('extra."startsAt" <= p_starts_at');
    expect(migrationSql).toContain('extra."endsAt" >= p_ends_at');
    expect(migrationSql).toContain('clinic."startMinuteOfDay" <= local_start_minute');
    expect(migrationSql).toContain('clinic."endMinuteOfDay" >= local_end_minute');
  });

  it("gives clinic blocked exceptions precedence over doctor extra hours", () => {
    expect(migrationSql).toContain('closure."type" = \'BLOCKED\'');
    expect(migrationSql).toContain("RETURN FALSE;");
    expect(migrationSql).toContain('tstzrange(closure."startsAt", closure."endsAt", \'[)\')');
  });

  it("protects both doctor writes and later clinic-hours changes", () => {
    expect(migrationSql).toContain('"DoctorWeeklySchedule_clinic_hours_coverage_trg"');
    expect(migrationSql).toContain('"DoctorScheduleException_clinic_hours_coverage_trg"');
    expect(migrationSql).toContain('"ClinicWeeklySchedule_doctor_coverage_trg"');
    expect(migrationSql).toContain('"ClinicScheduleException_doctor_coverage_trg"');
  });

  it("defers cross-table revalidation until transaction commit", () => {
    expect(migrationSql.match(/DEFERRABLE INITIALLY DEFERRED/g)).toHaveLength(2);
    expect(migrationSql).toContain("meruno_assert_doctor_schedule_clinic_coverage");
  });

  it("checks existing schedule rows without silently changing schedule or appointment data", () => {
    expect(migrationSql).toContain("PERFORM meruno_assert_doctor_schedule_clinic_coverage();");
    expect(migrationSql).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migrationSql).not.toMatch(/\bUPDATE\s+"(?:DoctorWeeklySchedule|DoctorScheduleException|Appointment)"\b/i);
    expect(migrationSql).not.toMatch(/\bDELETE\s+FROM\s+"(?:DoctorWeeklySchedule|DoctorScheduleException|Appointment)"\b/i);
  });
});
