# Apply Update 47 — Phase 6C3 Guest Self-Service Cancellation

## Before applying

1. Confirm Update 46 is the active local state and all five checks passed (458 unit tests across 51 files, 57 E2E tests, typecheck, lint, and production build).
2. Back up the verified Update 46 project folder or commit it locally.
3. Extract this ZIP into the existing `clinic-booking` project folder and allow folder merging.
4. Add the new files listed below. Replace only the two files listed under “Replace”.

## New files

- `src/app/api/public/appointments/guest/cancel/route.ts`
- `src/server/appointments/guest-appointment-cancellation.ts`
- `src/server/appointments/guest-appointment-cancellation-policy.ts`
- `src/server/appointments/guest-appointment-cancellation-validation.ts`
- `tests/unit/guest-appointment-cancellation-policy.test.ts`
- `tests/unit/guest-appointment-cancellation-validation.test.ts`
- `tests/e2e/guest-appointment-cancellation.spec.ts`
- `docs/appointments/phase-6c3-guest-self-service-cancellation.md`

## Replace only these files

- `README.md`
- `docs/implementation-roadmap.md`

Do not replace any other file. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, Prisma schema, all migrations, package files, environment configuration, all existing source files, and all existing tests.

## Business and security rules

- The endpoint is `POST /api/public/appointments/guest/cancel`.
- The request must be same-origin JSON. Its strict body contains only `managementToken`.
- Send the raw token only in the JSON body. Never put it in a URL, path, query string, application log, analytics event, error response, or audit record.
- The token must match the generated 32-byte base64url format (43 characters). The service hashes it with SHA-256 before lookup.
- Only a confirmed `PUBLIC_WEBSITE` appointment with `patientId = null` and an unresolved `GuestAppointmentContact` can be cancelled. A Patient-linked appointment cannot use the guest token; Reception linking already revokes that token.
- Cancellation is permitted at least 24 hours before the appointment, including the exact 24-hour boundary. Inside 24 hours the appointment remains unchanged and the response directs the guest to Reception.
- The transaction locks the Appointment row then GuestAppointmentContact row, re-reads the token/state, conditionally changes `CONFIRMED` to `CANCELLED`, writes lifecycle history and an `EXTERNAL` audit event, and invalidates the token hash atomically.
- A successful token cannot be replayed. A serialization conflict returns a safe 409. Invalid or revoked tokens receive a generic no-store 404.
- No account or Patient record is created. No guest rescheduling or Reception late-change workflow is added in this increment.

## Database and Prisma

No Prisma schema, migration, seed, Prisma Client, package, lockfile, dependency, or environment changes are included. Do not run `db:generate`, `db push`, migration preview, migrate dev/deploy/reset, or seed for this update.

## Local verification

Run the five checks in order:

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run test:e2e`
5. `npm run build`

Expected totals after this increment:

- 475 unit tests across 53 files.
- 62 Playwright E2E tests.

These are expected totals, not a claim that the local project test suite has already run. Stop at the first failure and send the complete output before changing files.
