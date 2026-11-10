# Apply MERUNO Update 43 — Phase 6B3B Guest Appointment Identity Resolution

## What this update does

Update 43 adds a Reception-only workflow to link an unresolved public guest appointment to one exact existing active Patient record after two distinct identity elements match the Patient's stored record.

The route does not trust the guest booking name/phone, booking reference, guest-management token, or a client-supplied identity claim. It does not create a Patient/MRN, account, family relationship, delegation grant, queue entry, or encounter. It preserves migration 9's deferred identity constraints and the existing patient/doctor/room overlap rules.

## 1. Back up and copy

1. Make a complete backup or commit the locally verified Update 42 state.
2. Extract this ZIP into the existing project root (`clinic-booking`).
3. Merge folders when Windows asks.
4. Add the new files at the exact paths below.
5. Replace only the three existing files listed below.

### New files to add

- `src/app/api/reception/appointments/[appointmentId]/resolve-guest/route.ts`
- `src/server/appointments/guest-appointment-resolution-validation.ts`
- `src/server/appointments/guest-appointment-resolution-policy.ts`
- `tests/unit/guest-appointment-resolution-validation.test.ts`
- `tests/unit/guest-appointment-resolution-policy.test.ts`
- `tests/e2e/guest-appointment-resolution.spec.ts`
- `docs/appointments/phase-6b3b-guest-identity-resolution.md`

### Existing files to replace

- `src/server/appointments/appointment-booking.ts`
- `README.md`
- `docs/implementation-roadmap.md`

Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, `prisma/schema.prisma`, or any folder under `prisma/migrations`. Keep migration 9 and the local PostgreSQL database unchanged.

## 2. Database and dependencies

- No Prisma schema change.
- No migration or seed.
- No Prisma Client generation.
- No `npm install` and no dependency change.
- No environment-variable change.

Do not run `db push`, `migrate dev`, `migrate deploy`, `migrate reset`, or a migration repair command for this update.

## 3. API behavior

`POST /api/reception/appointments/:appointmentId/resolve-guest`

The strict request body contains:

- `patientId`: an existing Patient ID selected by Reception.
- `identity`: two distinct identity elements supported by the existing Phase 5B patient verification contract.

The endpoint is addressed with an internal `appointmentId`. A Reception guest-appointment search/list endpoint and Reception UI are not part of this increment; a later Reception workspace must provide that internal ID without exposing the guest-management-token hash.

The service rechecks an active Reception employee in a Serializable transaction and accepts only an unresolved, confirmed `PUBLIC_WEBSITE` guest appointment and an active Patient.

- If the identifiers do not both match, a `FAILED` IdentityVerification and PII-minimal audit event are committed. The appointment remains unresolved and the API returns 409.
- If the Patient has an overlapping active appointment, a PII-minimal blocked-link event is committed. The guest appointment remains unresolved and the API returns 409. No overlap exception is applied.
- If both identifiers match and no overlap exists, one transaction writes the matching `VERIFIED` IdentityVerification, links `Appointment.patientId`, marks `GuestAppointmentContact` as `LINKED`, stores the resolving employee and timestamp, revokes the old guest management token by replacing its hash, and writes the audit events.

The guest contact's submitted name or phone is not identity evidence. The request does not let the client assign an employee, role, verification result, status, or overlap override. Submitted identity values are not persisted or audited.

## 4. Run the standard five checks

Run from the project root in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the verified Update 42 suite remains unchanged:

- Vitest: 406 passing tests across 44 files.
- Playwright: 53 passing tests.
- TypeScript, ESLint, and production build: pass.

## 5. If a check fails

Stop at the first failure and send the full output. Do not change the schema, migrations, database, environment, or unrelated files to work around an error. We will inspect the exact failure and prepare a narrowly scoped Fix if needed.

Use synthetic demo records only. This remains a portfolio/demo application, not production clinical software.
