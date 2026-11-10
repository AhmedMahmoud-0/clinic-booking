# MERUNO Update 41 — Fix 01

## Purpose

Fix one brittle unit-test assertion in `guest-appointment-migration.test.ts`. The migration's final explanatory SQL comment wraps the sentence across two `--` comment lines. The test was comparing the raw file as one uninterrupted substring, so it failed on formatting even though the doctor/room exclusion constraints were not changed.

The fix normalizes SQL comment lines before checking the explanatory sentence. It does not alter the migration SQL or runtime behavior.

## Apply

1. Keep a backup of the current project state.
2. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
3. Replace only:

   `tests/unit/guest-appointment-migration.test.ts`

4. Do not change or replace the migration folder, `schema.prisma`, application source files, package files, `.env`, or the PostgreSQL database.

## Database

No migration, Prisma generation, seed, database write, or database status command is required. Do not edit the already-applied migration `20261108060000_guest_appointment_identity`.

## Verification

First rerun the focused unit test:

```powershell
npx vitest run tests/unit/guest-appointment-migration.test.ts
```

Expected: 6 tests passed.

Then run the standard five checks in order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected suite totals remain 378 Unit Tests and 49 Playwright E2E tests. The fix does not add or remove tests.
