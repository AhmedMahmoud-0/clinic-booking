# Apply MERUNO Update 48 — Phase 6C4 Guest Self-Service Rescheduling

## Before applying

1. Confirm the local project is the fully verified Update 47 state (475 unit tests, 62 E2E tests, typecheck, lint, and build all passed).
2. Make a copy/backup of the project folder or commit the current state to Git.
3. Keep the existing `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, Prisma migration history, and local database unchanged.

## Apply the files

1. Extract this ZIP into the existing `clinic-booking` project folder.
2. Merge folders when Windows asks.
3. Add the seven new TypeScript files listed below.
4. Replace only these existing files:
   - `README.md`
   - `docs/implementation-roadmap.md`
5. Do not replace any other existing file.

### New TypeScript files

- `src/app/api/public/appointments/guest/reschedule/route.ts`
- `src/server/appointments/guest-appointment-rescheduling.ts`
- `src/server/appointments/guest-appointment-rescheduling-policy.ts`
- `src/server/appointments/guest-appointment-rescheduling-validation.ts`
- `tests/unit/guest-appointment-rescheduling-policy.test.ts`
- `tests/unit/guest-appointment-rescheduling-validation.test.ts`
- `tests/e2e/guest-appointment-rescheduling.spec.ts`

### New documentation file

- `docs/appointments/phase-6c4-guest-self-service-rescheduling.md`

## No database commands required

This update does not change `prisma/schema.prisma`, migrations, seed data, Prisma configuration, generated client, dependencies, environment variables, or package scripts. Do not run `db push`, `migrate dev`, `migrate deploy`, migration reset, or Prisma generation for this update.

## Local verification

Run these commands in order and stop on the first failure:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals after applying the update:

- 495 Unit tests across 55 files.
- 66 Playwright E2E tests.
- Typecheck, lint, and production build pass.

These are expected totals, not a claim that the full project suite was run in the packaging environment. Send the complete output for review before proceeding to the next phase.
