# Apply MERUNO Update 49 — Phase 6C5

## Before applying

1. Confirm the local project is at the verified Update 48 state (495 unit tests, 66 E2E tests, typecheck, lint, and production build passed).
2. Make a backup of the current `clinic-booking` project folder or commit the verified state to Git.
3. Close any running Next.js development server before replacing files.

## Apply the patch

1. Extract this ZIP directly into the existing `clinic-booking` project root.
2. Merge the included `src`, `tests`, and `docs` folders with the same folders in the project.
3. Add the eight new TypeScript files listed in `UPDATE_49_FILE_GUIDE.md`.
4. Replace only these two existing files:
   - `README.md`
   - `docs/implementation-roadmap.md`
5. Do not remove or replace any other project files.

## Database and dependencies

This update adds no Prisma model, schema change, SQL migration, seed, dependency, package script, environment variable, or configuration change.

- Do not run `prisma migrate dev`, `prisma migrate deploy`, `db push`, or a database reset for this update.
- `npm install` is not required.
- `prisma generate` is not required.

## Verify locally

Run the established project verification sequence from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals after the patch:

- 511 unit tests across 57 files.
- 70 Playwright E2E tests.
- TypeScript, ESLint, and production build succeed.

The expected totals assume the starting Update 48 state and no unrelated local test changes. If a command fails, stop and share the complete output before continuing.

## Scope reminder

Update 49 adds Reception-only server endpoints to cancel or reschedule an upcoming `CONFIRMED` appointment, for both Patient-linked and identity-consistent guest appointments. It does not add the Reception appointment list/search UI, check-in, waiting queue, walk-ins, no-show processing, or any doctor/service transfer. The appointment ID must come from a future authorized Reception workspace or another already-authorized internal caller.
