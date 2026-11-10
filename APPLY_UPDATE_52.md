# Apply MERUNO Update 52 — Phase 6D3 Walk-in Registration

## Before applying

1. Confirm Update 51 is the current applied project state and all its local checks passed.
2. Make a backup of the complete `clinic-booking` project folder.
3. Close any running Next.js/Playwright processes that could hold files under `.next`.

## Apply files

1. Extract this ZIP directly into the existing `clinic-booking` project root.
2. Merge the new files into their matching folders.
3. Replace only the three existing files listed in `UPDATE_52_FILE_GUIDE.md`.
4. Do not replace or delete other files. In particular, preserve `.env`, `.git`, `node_modules`, `.next`, generated Prisma Client, `package.json`, lock files, `prisma/schema.prisma`, and all existing migrations.

## Database and dependencies

This update reuses existing `Patient`, `DoctorProfile`, clinic/doctor schedules and exceptions, `IdentityVerification`, `QueueEntry`, and `AuditLog` models. It adds no schema or migration changes, seed changes, Prisma generation requirements, dependency changes, package scripts, or environment variables.

Do not run `db push`, `migrate dev`, `migrate deploy`, database reset, seed, or any migration repair for this update.

## Local verification

Run in order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals from the patch's added tests: **561 Unit tests across 62 files** and **80 Playwright E2E tests**, plus successful typecheck, lint, and production build.

If any command fails, stop and share the complete output before making manual edits. The expected counts are targets; the local project's output is authoritative.
