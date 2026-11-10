# Apply MERUNO Update 41 — Phase 6B2 Public Guest Appointment Booking

## What this update does

Update 41 adds a public guest appointment endpoint without manufacturing a Patient record or MRN. It introduces a dedicated `GuestAppointmentContact` model, makes `Appointment.patientId` optional for unresolved guests, stores a one-time guest-management token as a SHA-256 hash, and adds deferred PostgreSQL identity invariants. A guest appointment cannot enter check-in, queue, encounter, or clinical states until Reception links it to the exact Patient after a two-element identity verification.

## 1. Back up and copy

1. Make a complete backup or commit the verified Update 40 state.
2. Extract this ZIP into the existing project root (`clinic-booking`).
3. Merge folders when Windows asks.
4. Add the new files at the exact paths below.
5. Replace only the existing files listed below.

### New files to add

- `prisma/migrations/20261108060000_guest_appointment_identity/migration.sql`
- `src/server/appointments/guest-appointment-booking-validation.ts`
- `src/server/appointments/guest-appointment-identity-policy.ts`
- `src/app/api/public/appointments/guest/route.ts`
- `tests/unit/guest-appointment-booking-validation.test.ts`
- `tests/unit/guest-appointment-identity-policy.test.ts`
- `tests/unit/guest-appointment-migration.test.ts`
- `tests/e2e/guest-appointment-booking.spec.ts`
- `docs/appointments/phase-6b2-guest-appointment-booking.md`

### Existing files to replace

- `prisma/schema.prisma`
- `src/server/appointments/appointment-booking.ts`
- `README.md`
- `docs/implementation-roadmap.md`

Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, or any existing migration folder. Keep all eight previously applied migrations unchanged.

## 2. Prisma validation and client generation

Run these two commands from the project root:

```powershell
npm run db:validate
npm run db:generate
```

Both must pass before attempting to apply migration 9.

## 3. Confirm and apply migration 9

Check the migration state:

```powershell
npm run db:migrate:status
```

Expected state before deployment: 9 migrations found; only this migration is pending:

`20261108060000_guest_appointment_identity`

Apply it:

```powershell
npx prisma migrate deploy --config=./prisma7.config.ts
```

Then check again:

```powershell
npm run db:migrate:status
```

Expected result: 9 migrations found and `Database schema is up to date!`.

Do not use `db push`, `migrate reset`, manual edits to `_prisma_migrations`, or destructive recovery commands. Migration 9 only relaxes the existing `Appointment.patientId` NOT NULL requirement for guest-only appointments and adds a separate contact table, indexes, foreign keys, checks, and triggers. It does not delete or rewrite existing patient appointments or weaken the doctor/room exclusion constraints.

## 4. Run the standard five checks

Run in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the verified Update 40 suite is unchanged:

- Vitest: 378 passing tests across 40 files.
- Playwright: 49 passing tests.
- TypeScript, ESLint, and production build: pass.

## 5. Important behavioral boundaries

- Guest booking does not create a Patient, MRN, PatientContact, PatientAccount, identity-verification record, or delegation grant.
- The phone number is for later Reception lookup only; it is not identity proof and does not auto-link an existing Patient.
- The public response returns the booking confirmation and one-time `guestManagementToken`. Store it securely in the future UI; do not log it, put it in a URL, or share it. Only its SHA-256 hash is stored in PostgreSQL.
- Guest email is optional and is not verified or used for delivery in this increment. No SMS/WhatsApp or email provider integration is added.
- The guest contact is not available through the Patient Portal. Reception resolution is a separate future operation requiring two distinct identity elements and matching `IdentityVerification` evidence.
- A guest appointment may remain `CONFIRMED`, or later be cancelled/no-show, but cannot be checked in or used for a QueueEntry/Encounter until it is linked to a Patient.
- The existing patient-overlap exclusion does not apply while `patientId` is null. On later Reception linking, PostgreSQL rechecks it; an overlap must be handled by the separately designed 6B3 workflow. Doctor and room exclusion constraints remain unchanged.
- This increment does not implement Reception appointment creation or the patient-overlap exception.

Do not use real patient data. This remains a portfolio/demo system, not production clinical software. See `docs/appointments/phase-6b2-guest-appointment-booking.md` for the identity model and database invariants.
