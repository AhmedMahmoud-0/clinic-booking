# Apply MERUNO Update 40 — Phase 6B1 Authenticated Patient Booking

## What this update does

Update 40 introduces the first appointment-creation operation for verified patient-portal users. It supports booking for the authenticated patient or for a subject patient covered by the exact active `BOOK_APPOINTMENTS` delegation scope.

The booking is executed in a Prisma `Serializable` transaction. It reuses the Phase 6A availability calculation through the transaction client, rechecks patient booking authority and conflicts, snapshots the selected doctor-service duration and price, assigns a free configured consultation room when rooms exist, creates a `CONFIRMED` appointment, and writes the initial patient-actor status-history row atomically.

This increment does **not** implement guest booking or Reception booking. It does not implement the special Reception patient-overlap override, because the existing PostgreSQL patient-overlap exclusion constraint still prevents all patient overlaps. That constraint is intentionally unchanged.

## 1. Back up and copy

1. Make a copy of the current project folder or commit the verified Update 39 state.
2. Extract this ZIP into the existing project root (`clinic-booking`).
3. Merge folders when Windows asks.
4. Add the new files at the exact paths below.
5. Replace only the three existing files listed below when Windows asks.

### New files to add

- `src/server/appointments/appointment-booking-errors.ts`
- `src/server/appointments/appointment-booking-policy.ts`
- `src/server/appointments/appointment-booking-validation.ts`
- `src/server/appointments/appointment-booking.ts`
- `src/app/api/patient/appointments/route.ts`
- `tests/unit/appointment-booking-policy.test.ts`
- `tests/unit/appointment-booking-validation.test.ts`
- `tests/e2e/patient-appointment-booking.spec.ts`
- `docs/appointments/phase-6b1-authenticated-patient-booking.md`

### Existing files to replace

- `src/server/appointments/appointment-availability.ts`
- `README.md`
- `docs/implementation-roadmap.md`

Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, or the local PostgreSQL database.

## 2. Dependencies and database

- No `npm install` is required; no dependency changed.
- No Prisma schema change or Prisma Client generation is required.
- No migration, seed, `db push`, reset, or database write is included by applying this update.
- No environment variable changes are required.

The new API writes an `Appointment` and its initial `AppointmentStatusHistory` at request time, but it uses the existing schema and currently applied migrations. It does not create a `QueueEntry`; check-in remains a separate Reception workflow.

## 3. API contract

`POST /api/patient/appointments`

The request must be same-origin JSON and must be sent by a verified patient-portal session. The JSON body contains only:

- `patientId`
- `doctorId` (`DoctorProfile.id`)
- `serviceId` (`ServiceCatalog.id`)
- `startsAt` (the exact canonical UTC instant returned by the Phase 6A availability endpoint)

The server determines the booking source and status. It does not accept a client-supplied price, duration, room, appointment status, or source.

For another patient record, the actor must have an active grant with the exact `BOOK_APPOINTMENTS` scope. Guardian and adult-delegate conditions reuse the existing delegation policy; a family relationship alone is never authorization. Booking authority does not grant medical-record access.

## 4. Run the five local checks

Run from the project root in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the verified Update 39 suite is unchanged apart from this update:

- Vitest: 356 passing tests across 37 files.
- Playwright: 46 passing tests.
- TypeScript, ESLint, and production build: pass.

No `db:validate`, `db:generate`, `db:migrate:status`, or migration command is needed for this update because `prisma/schema.prisma` and `prisma/migrations` are unchanged.

Playwright starts its own HTTPS Next.js server. Do not start another `npm run dev` process on the configured Playwright port while `npm run test:e2e` is running. The existing self-signed-certificate warning may appear; it is not itself a test failure.

## 5. Deliberately deferred

- Guest booking, provisional guest identity, and Reception arrival verification/linking.
- Reception appointment-creation route and the specially authorized/audited patient-overlap exception.
- Booking screens/stepper, patient appointment pages, Reception screens, queue/check-in, and walk-ins.
- Cancellation, rescheduling, late cancellation, no-show, booking notifications, and reminders.

Do not create a verified patient or official MRN from a guest phone number alone. Do not drop or weaken `Appointment_patient_no_overlap`; the Reception exception needs a separate transaction-safe PostgreSQL design that preserves doctor and room overlap constraints.

See `docs/appointments/phase-6b1-authenticated-patient-booking.md` for the exact authority rules, transaction sequence, and remaining design gates.
