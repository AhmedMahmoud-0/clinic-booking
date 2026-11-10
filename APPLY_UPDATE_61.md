# Apply MERUNO Update 61 — Phase 7H Doctor Referrals

## What this update adds

1. Adds `GET /api/doctor/encounters/:encounterId/referrals` to read referrals on the authenticated Doctor's own active Encounter.
2. Adds `POST /api/doctor/encounters/:encounterId/referrals` to create a `PENDING` internal or external referral for that Encounter.
3. Reuses the original `Referral` model and original database target-type integrity constraint. No Prisma schema change or migration is included.
4. Adds strict request validation, target availability checks, Doctor/Encounter ownership checks, transactional audit logging, and focused unit/E2E coverage.

This is API/data-layer work only. It does not add a referral inbox, accept/reject/complete/cancel actions, follow-up, or user interface.

## Files to add

- `src/server/appointments/doctor-referral.ts`
- `src/server/appointments/doctor-referral-policy.ts`
- `src/server/appointments/doctor-referral-validation.ts`
- `src/app/api/doctor/encounters/[encounterId]/referrals/route.ts`
- `tests/unit/doctor-referral-policy.test.ts`
- `tests/unit/doctor-referral-validation.test.ts`
- `tests/e2e/doctor-referrals.spec.ts`
- `docs/clinical/phase-7h-doctor-referrals.md`
- `UPDATE_61_SUMMARY.txt`

## Files to replace

- `README.md`
- `docs/implementation-roadmap.md`

No other existing project file should be replaced.

## Apply

1. Back up the `clinic-booking` project folder.
2. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
3. Add all new files at the exact paths listed above.
4. Replace only `README.md` and `docs/implementation-roadmap.md` when prompted.
5. Keep `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, the entire `prisma/schema.prisma`, every existing migration folder (including migrations 1–12), and the local PostgreSQL database unchanged.

## Database steps

There is no Prisma schema change and no migration in this update. Do not run `db push`, `migrate reset`, seed commands, or migration-preview generation. Migration 12 remains the latest already-applied database migration.

## Verification

Run from the project root, in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the confirmed Update 60 baseline remains unchanged and no unrelated tests have been added or removed:

- **836 unit tests** across the resulting test files (36 added: 20 policy + 16 validation)
- **112 Playwright E2E tests** (3 added)

These are expected counts, not a claim that the checks have already run on your machine. If any check fails, stop and send the complete output before continuing to another update.

## Safety boundaries

- Only the authenticated active Doctor can read or create referrals for their own `IN_PROGRESS` Encounter.
- Internal referrals require an active Specialty, an active Doctor, or both. When both are supplied, the Doctor must be associated with that Specialty.
- External referrals require a facility name and cannot include internal Specialty/Doctor targets.
- The server controls the author, Encounter relationship, `PENDING` status, and timestamps. Strict schemas reject forged lifecycle or identity fields.
- Each referral creation is transactionally audited. Audit text excludes the clinical reason and external contact details.
- Multiple deliberate referrals for one Encounter are allowed; no idempotency token is introduced.
- Referral lifecycle transitions and referred-to Doctor workflows are not part of this update.
- This remains a synthetic-data portfolio/demo application, not production clinical software.
