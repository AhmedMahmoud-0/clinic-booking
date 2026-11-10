# Apply MERUNO Update 42 — Phase 6B3A Reception Booking

## What this update does

Update 42 adds standard Reception booking for an existing active Patient record. It reuses the current appointment availability and Serializable booking transaction. It does **not** implement the special patient-overlap override; that is kept in a separate Phase 6B3B increment because it needs its own database-level audit and authorization design.

## 1. Back up and copy

1. Make a copy of the current project folder or commit the verified Update 41 + Fix 01 state.
2. Extract this ZIP into the existing project root (`clinic-booking`).
3. Merge folders when Windows asks.
4. Add the new files listed below.
5. Replace only the existing files listed below.

### Files to add

- `src/app/api/reception/appointments/route.ts`
- `src/server/appointments/reception-appointment-booking-validation.ts`
- `src/server/appointments/reception-appointment-booking-policy.ts`
- `tests/unit/reception-appointment-booking-validation.test.ts`
- `tests/unit/reception-appointment-booking-policy.test.ts`
- `tests/e2e/reception-appointment-booking.spec.ts`
- `docs/appointments/phase-6b3a-reception-booking.md`

### Files to replace

- `src/server/appointments/appointment-booking.ts`
- `README.md`
- `docs/implementation-roadmap.md`

Do not replace any other files.

## 2. Protected files and database

Keep the existing `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, and local PostgreSQL database.

- No Prisma schema change.
- No Prisma Client generation.
- No migration or seed.
- No `npm install` and no dependency change.
- Migration 9 from Update 41 remains applied and unchanged.

## 3. Important behavior

- Only an authenticated employee with the `appointment.manage` permission can call the route.
- The service rechecks that the employee is active and has an active `RECEPTION` role assignment inside the Serializable transaction.
- Only an existing active Patient can be booked through this route.
- The client cannot submit employee identity, role, or overlap-override fields.
- The selected slot, doctor/service configuration, service duration/price, patient overlap, and room availability are revalidated inside the transaction.
- The appointment source is `RECEPTION`; the employee is recorded as creator and status-history actor; a PII-minimal audit event is written in the same transaction.
- The patient-overlap exception is deliberately not enabled. A conflict returns 409. Doctor and room overlap safeguards remain unchanged.

## 4. Run the five local checks

Run from the project root in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the current Update 41 test suite has not been changed locally:

- Vitest: 390 tests across 42 files.
- Playwright: 51 tests.
- TypeScript, ESLint, and production build: pass.

No migration-status or database command is required for this update.

## 5. If a check fails

Stop at the first failure and send the full output. Do not edit the Prisma schema, migrations, database, or other files to work around a TypeScript, lint, unit-test, E2E, or build failure. We will inspect the exact failure and prepare a narrowly scoped fix if needed.
