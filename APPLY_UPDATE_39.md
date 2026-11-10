# Apply MERUNO Update 39 — Phase 6A Public Appointment Availability

## What this update does

Update 39 starts Phase 6 with a public, read-only endpoint that calculates candidate appointment slots using the clinic and doctor schedules already present in the project.

It reuses the existing appointment, doctor-service, clinic-hours, doctor-schedule, exception, consultation-room, and clinic-time foundations. It does not create or reserve appointments.

## 1. Back up and copy

1. Make a copy of the current project folder or commit the verified Update 38 state.
2. Extract this ZIP into the existing project root (`clinic-booking`).
3. Merge folders when Windows asks.
4. Add the new files at the exact paths below.
5. Replace only the four existing files listed below when Windows asks.

### New files to add

- `src/app/api/public/appointment-availability/route.ts`
- `src/server/appointments/availability-errors.ts`
- `src/server/appointments/availability-policy.ts`
- `src/server/appointments/availability-validation.ts`
- `src/server/appointments/appointment-availability.ts`
- `tests/unit/appointment-availability-policy.test.ts`
- `tests/unit/appointment-availability-validation.test.ts`
- `tests/e2e/appointment-availability.spec.ts`
- `docs/appointments/phase-6a-availability-foundation.md`

### Existing files to replace

- `src/lib/clinic-time.ts`
- `tests/unit/clinic-time.test.ts`
- `README.md`
- `docs/implementation-roadmap.md`

Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, or the local PostgreSQL database.

## 2. Dependencies and database

- No `npm install` is required; no dependency changed.
- No Prisma schema change or Prisma Client generation is required.
- No migration, seed, `db push`, reset, or database write is included.
- No environment variable changes are required.

The endpoint is read-only. It does not create a patient, appointment, queue entry, room assignment, status-history row, or audit event.

## 3. Endpoint contract

`GET /api/public/appointment-availability?doctorId=<doctor-profile-id>&serviceId=<service-catalog-id>&date=YYYY-MM-DD`

- `doctorId` is the `DoctorProfile.id`, not an Employee ID.
- `serviceId` is the `ServiceCatalog.id` exposed in the public clinic catalog.
- `date` is a real calendar date in `Africa/Cairo`, not the device/server local date.
- The service must be an active `CONSULTATION` or `FOLLOW_UP` offering for that doctor.
- The doctor must be active, publicly visible, bookable, and assigned to an active specialty.
- If clinic/doctor schedules are not configured, no slots are returned. This is intentional: no hours or shifts have been seeded or inferred.
- If consultation rooms have been configured, a candidate slot is returned only when at least one room is not occupied. No room is reserved by this endpoint.
- Only the minimal public doctor/service/slot data is returned. Responses are `Cache-Control: no-store`.

This endpoint is advisory. A future booking endpoint must recalculate and verify availability inside its transaction. Do not treat an availability response as a reservation.

## 4. Run the five local checks

Run from the project root in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the current verified suite is unchanged apart from this update:

- Vitest: 332 passing tests across 35 files.
- Playwright: 45 passing tests.
- TypeScript, ESLint, and production build: pass.

Playwright starts its own HTTPS Next.js server. Do not start a second `npm run dev` process on the configured Playwright port while `npm run test:e2e` is running. The existing self-signed-certificate warning may appear; it is not itself a test failure.

## 5. What is intentionally deferred

Do not add booking mutations as part of this update. Before Phase 6B writes bookings, the project must resolve:

1. How a phone-only guest booking maps safely to the required `Appointment.patientId` without pretending the guest is already a verified patient. Reception's current two-identifier registration process must not be bypassed or reused to create a verified patient from a phone number alone.
2. How the approved, permissioned, reasoned, audited Reception exception for a patient's overlapping appointments is reconciled with the existing unconditional PostgreSQL patient-overlap exclusion constraint. Doctor and consultation-room conflict protection must remain in force.
3. How child/guardian and adult-delegate booking authority is checked separately from access to medical records.

See `docs/appointments/phase-6a-availability-foundation.md` for the complete rules and design gates.

Do not make any database changes or run any migration for Update 39.
