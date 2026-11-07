import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  resolve(
    process.cwd(),
    "prisma/migrations/20261107230000_add_consultation_rooms/migration.sql",
  ),
  "utf8",
);

describe("Phase 4A consultation-room migration contract", () => {
  it("creates a separate consultation-room catalog with stable unique codes", () => {
    expect(migrationSql).toContain('CREATE TABLE "ConsultationRoom"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "ConsultationRoom_code_key"');
    expect(migrationSql).toContain('"isActive" BOOLEAN NOT NULL DEFAULT TRUE');
  });

  it("adds an optional restrictive room reference without changing existing appointments", () => {
    expect(migrationSql).toContain('ADD COLUMN "consultationRoomId" TEXT');
    expect(migrationSql).toContain('REFERENCES "ConsultationRoom"("id")');
    expect(migrationSql).toContain('ON DELETE RESTRICT');
  });

  it("prevents concurrent active appointments from occupying the same room", () => {
    expect(migrationSql).toContain('CREATE EXTENSION IF NOT EXISTS btree_gist');
    expect(migrationSql).toContain('"Appointment_consultation_room_no_overlap"');
    expect(migrationSql).toContain(`tstzrange("startsAt", "endsAt", '[)') WITH &&`);
    expect(migrationSql).toContain("'CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION'");
  });
});
