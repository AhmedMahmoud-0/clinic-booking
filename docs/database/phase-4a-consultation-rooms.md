# Phase 4A — Consultation-room database foundation

## Purpose

Add a distinct master-data entity for outpatient consultation rooms and make it possible for a future appointment to reserve one. This does not implement room administration screens or booking workflows.

## Existing models reused

The project already contains `Specialty`, `Employee`, `DoctorProfile`, `DoctorSpecialty`, `ServiceCatalog`, `DoctorService`, `DoctorWeeklySchedule`, `DoctorScheduleException`, `LabTest`, `RadiologyProcedure`, and `RadiologyResource`. The current catalog seed already defines seven specialties, eight synthetic doctors, consultation/follow-up services with synthetic EGP prices, eight laboratory tests, four permitted radiology procedures, and one resource for digital X-ray plus one for ultrasound.

`RadiologyResource` is intentionally not reused for consultation rooms: it is modality-bound to digital X-ray or ultrasound. Consultation rooms are a separate appointment resource.

## Schema change

`ConsultationRoom` fields:

- `id`: Prisma CUID primary key.
- `code`: unique stable room code.
- `name`: room display name.
- `location`: optional human-readable in-clinic location.
- `isActive`: soft-deactivation flag; default `true`.
- `createdAt` and `updatedAt`: timestamps.

`Appointment.consultationRoomId` is nullable. Existing appointments therefore remain unchanged. The relation uses `onDelete: Restrict`; historical appointment references must not be broken by deleting a room.

## Database integrity

The additive migration creates a separate room table and adds the nullable appointment foreign key. A PostgreSQL GiST exclusion constraint blocks intersecting `[startsAt, endsAt)` time ranges for the same room while an appointment is `CONFIRMED`, `CHECKED_IN`, `WAITING`, or `IN_CONSULTATION`. Adjacent visits that meet exactly at an endpoint are allowed. Cancelled and no-show appointments do not reserve the room.

The constraint is database-enforced, so concurrent booking transactions cannot both reserve the same room/time range. The booking service must still validate that a selected room exists and is active; assignment is implemented in Phase 6.

## Seed decision

No consultation-room records are seeded. The approved scope gives the doctor count but does not specify the real/demo consultation-room count. The application must not silently invent an operational layout. Existing synthetic specialty, doctor, service, laboratory, and radiology catalog records remain untouched.

## Migration safety

Migration folder: `20261107230000_add_consultation_rooms`.

The migration is additive:

- creates one new table;
- adds one nullable column to `Appointment`;
- adds indexes, a foreign key, and a room-overlap exclusion constraint;
- does not update or delete existing rows;
- does not recreate or replace the existing migration history.

Before applying, validate the schema and generate the Prisma client. Confirm the target `DATABASE_URL` is the local development database. Apply with `prisma migrate deploy` and verify the status is clean. Never use `db push`, `migrate reset`, or the initial migration preview generator for this change.

## Scope boundary

This package does not add room CRUD APIs, screens, clinic-hour settings, individual doctor shifts, or public booking behavior. Those belong to later Phase 4 administration and Phase 6 appointment booking. It does not change the single-branch architecture.


## Update 28 Fix 01 — test syntax correction

The first local verification exposed a TypeScript parser error in the migration-contract test assertion for the PostgreSQL `tstzrange` exclusion expression. The SQL migration itself is unchanged. Fix 01 replaces the malformed double-quoted TypeScript string with a template literal so the embedded SQL identifier quotes remain part of the expected text. This is a test-source correction only and has no database or migration-history impact.
