# Apply MERUNO Update 25 — Phase 3G-B1 Verified Email Change

## What this update does

Adds a self-service email-change workflow for an authenticated, email-verified Better Auth account. The user must approve the change from the current address and verify the new address. Only after both steps does MERUNO update the sign-in identity and synchronize linked employee/patient email records in one serializable database transaction.

## Apply the package

1. Back up the current project folder or commit the locally verified Update 24 Fix 01 state.
2. Extract this ZIP into the existing project root (`clinic-booking`) and merge folders.
3. Add the new files listed in `UPDATE_25_FILE_GUIDE.md`.
4. Replace only the existing files listed in that guide.
5. Keep `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, and the local PostgreSQL database unchanged.

## Email behavior

- The first link is sent to the current email and expires after 15 minutes.
- The second link is sent to the proposed email and expires after one hour.
- Each link requires an explicit confirmation button; a GET request alone does not complete the step.
- The current email remains unchanged until the new address is verified.
- After final confirmation, `User.email` and any linked `Employee.workEmail` / patient `PatientContact` email are synchronized atomically. All active sessions are revoked, so sign-in is required again.
- Address conflicts or linked employee synchronization mismatches stop the transaction without partially changing the records.

Local development uses the existing non-production console email transport. The two confirmation URLs will appear in the Next.js terminal under `[MERUNO local auth email]`. Treat those token URLs as secrets. Production continues to use the existing Resend environment variables; no new environment setting is required.

## Dependencies and database

- No `npm install` is required; no dependency or package script changes.
- No Prisma schema or migration change.
- No Prisma Client generation, migration, seed, `db push`, reset, or database write is required before running this update.
- The existing `Verification` table stores a namespaced pending state and a token digest.

## Local test scenarios

Use synthetic identities only:

1. Request an email change, then confirm the old address. Verify that the new address receives a second link and the login email remains unchanged.
2. Complete the new-address verification. Confirm the Better Auth email changes, the linked employee work email and/or patient email contact are synchronized, and all sessions are revoked.
3. Try an address already used by another user, employee, or patient contact. It must be rejected.
4. Try to open a link after expiry or reuse it. It must be rejected.
5. For an employee-linked account, deliberately make `Employee.workEmail` differ from the current sign-in email in a disposable local test record. Final confirmation must fail without partial updates.
6. Confirm that public patient registration still does not create clinic Patient records or employee roles.

## Run validation in this exact order

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected test additions: 10 unit tests and 3 E2E tests. The baseline after Update 24 Fix 01 was 41 unit tests and 11 E2E tests; assuming no other local test changes, the new totals should be 51 unit tests and 14 E2E tests.
