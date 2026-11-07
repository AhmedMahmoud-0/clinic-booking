-- MERUNO Phase 4A: consultation-room master data and appointment assignment.
-- Additive migration only. Existing appointments remain unassigned (NULL room).
-- Room overlap is enforced in PostgreSQL for active appointment states.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "ConsultationRoom" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "location" VARCHAR(120),
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ConsultationRoom_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConsultationRoom_code_nonempty_chk" CHECK (length(btrim("code")) > 0),
    CONSTRAINT "ConsultationRoom_name_nonempty_chk" CHECK (length(btrim("name")) > 0),
    CONSTRAINT "ConsultationRoom_location_nonempty_chk" CHECK ("location" IS NULL OR length(btrim("location")) > 0)
);

CREATE UNIQUE INDEX "ConsultationRoom_code_key"
    ON "ConsultationRoom"("code");

CREATE INDEX "ConsultationRoom_isActive_code_idx"
    ON "ConsultationRoom"("isActive", "code");

ALTER TABLE "Appointment"
    ADD COLUMN "consultationRoomId" TEXT;

CREATE INDEX "Appointment_consultationRoomId_startsAt_endsAt_idx"
    ON "Appointment"("consultationRoomId", "startsAt", "endsAt");

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_consultationRoomId_fkey"
    FOREIGN KEY ("consultationRoomId")
    REFERENCES "ConsultationRoom"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_consultation_room_no_overlap"
    EXCLUDE USING GIST (
        "consultationRoomId" WITH =,
        tstzrange("startsAt", "endsAt", '[)') WITH &&
    )
    WHERE (
        "consultationRoomId" IS NOT NULL
        AND "status" IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION')
    );
