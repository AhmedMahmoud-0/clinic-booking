-- MERUNO Phase 4B1: single-branch weekly clinic hours and date-specific exceptions.
-- Additive migration only. No opening hours or doctor shifts are guessed or seeded.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "ClinicWeeklySchedule" (
    "id" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "startMinuteOfDay" INTEGER NOT NULL,
    "endMinuteOfDay" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ClinicWeeklySchedule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicWeeklySchedule_minutes_range_chk"
        CHECK ("startMinuteOfDay" >= 0 AND "startMinuteOfDay" < "endMinuteOfDay" AND "endMinuteOfDay" <= 1440),
    CONSTRAINT "ClinicWeeklySchedule_effective_dates_chk"
        CHECK ("effectiveUntil" IS NULL OR "effectiveUntil" >= "effectiveFrom")
);

CREATE INDEX "ClinicWeeklySchedule_weekday_isActive_idx"
    ON "ClinicWeeklySchedule"("weekday", "isActive");

CREATE INDEX "ClinicWeeklySchedule_effectiveFrom_effectiveUntil_idx"
    ON "ClinicWeeklySchedule"("effectiveFrom", "effectiveUntil");

-- Multiple split shifts per weekday are allowed, but active time/date windows
-- for the same weekday may not overlap.
ALTER TABLE "ClinicWeeklySchedule"
    ADD CONSTRAINT "ClinicWeeklySchedule_no_overlap"
    EXCLUDE USING GIST (
        "weekday" WITH =,
        daterange("effectiveFrom", "effectiveUntil", '[]') WITH &&,
        int4range("startMinuteOfDay", "endMinuteOfDay", '[)') WITH &&
    ) WHERE ("isActive" = TRUE);

CREATE TABLE "ClinicScheduleException" (
    "id" TEXT NOT NULL,
    "type" "ScheduleExceptionType" NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" VARCHAR(500),
    "createdByEmployeeId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicScheduleException_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicScheduleException_time_range_chk"
        CHECK ("endsAt" > "startsAt"),
    CONSTRAINT "ClinicScheduleException_reason_nonempty_chk"
        CHECK ("reason" IS NULL OR length(btrim("reason")) > 0),
    CONSTRAINT "ClinicScheduleException_createdByEmployeeId_fkey"
        FOREIGN KEY ("createdByEmployeeId")
        REFERENCES "Employee"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX "ClinicScheduleException_startsAt_endsAt_idx"
    ON "ClinicScheduleException"("startsAt", "endsAt");

CREATE INDEX "ClinicScheduleException_createdByEmployeeId_idx"
    ON "ClinicScheduleException"("createdByEmployeeId");

-- Prevent contradictory overlapping exceptions. BLOCKED may overlap the
-- regular weekly schedule; EXTRA_HOURS may extend it, but exceptions do not
-- overlap each other.
ALTER TABLE "ClinicScheduleException"
    ADD CONSTRAINT "ClinicScheduleException_no_overlap"
    EXCLUDE USING GIST (
        tstzrange("startsAt", "endsAt", '[)') WITH &&
    );
