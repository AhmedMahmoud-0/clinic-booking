# Apply MERUNO Update 62 — Phase 7I Doctor Referral Inbox and Lifecycle

## What this update adds

1. Adds `GET /api/doctor/referrals/inbox` for the authenticated active Doctor's open internal referrals.
2. Adds `POST /api/doctor/referrals/:referralId` for `ACCEPT`, `COMPLETE`, and `CANCEL` actions.
3. Restricts inbox access to direct Doctor targets or active specialty membership, and restricts direct referrals to their named Doctor.
4. Enforces the existing lifecycle transitions and writes an audit event atomically with each status change.
5. Uses the existing `Referral` model and `ReferralStatus` enum. No Prisma schema or migration is included.

## Important lifecycle limitation

The existing enum contains only `PENDING`, `ACCEPTED`, `COMPLETED`, and `CANCELLED`; it has no `REJECTED` state. This update deliberately does not add one or treat cancellation as rejection. Specialty-only referrals are team-owned because the current schema does not persist an accepted-by employee; an active Doctor in that specialty can complete an accepted specialty referral.

## Files to add

- `src/server/appointments/doctor-referral-lifecycle-policy.ts`
- `src/server/appointments/doctor-referral-lifecycle-validation.ts`
- `src/server/appointments/doctor-referral-lifecycle.ts`
- `src/app/api/doctor/referrals/inbox/route.ts`
- `src/app/api/doctor/referrals/[referralId]/route.ts`
- `tests/unit/doctor-referral-lifecycle-policy.test.ts`
- `tests/unit/doctor-referral-lifecycle-validation.test.ts`
- `tests/e2e/doctor-referral-lifecycle.spec.ts`
- `docs/clinical/phase-7i-doctor-referral-inbox-lifecycle.md`
- `UPDATE_62_SUMMARY.txt`

## Files to replace

- `README.md`
- `docs/implementation-roadmap.md`

No other existing project file should be replaced.

## Apply

1. Back up the `clinic-booking` project folder.
2. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
3. Add all new files at the exact paths listed above.
4. Replace only `README.md` and `docs/implementation-roadmap.md` when prompted.
5. Keep `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, `prisma/schema.prisma`, all existing migration folders (including migrations 1–12), and the local PostgreSQL database unchanged.

## Database steps

There is no Prisma schema change and no migration in this update. Do not run `db push`, `migrate reset`, seed commands, or migration-preview generation. Migration 12 remains the latest database migration.

## Verification

Run from the project root, in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the confirmed Update 61 baseline remains unchanged and no unrelated tests have been added or removed:

- **869 unit tests** across 82 test files (33 added: 26 lifecycle-policy + 7 validation)
- **116 Playwright E2E tests** (4 added)

These are expected counts, not a claim that the checks have already run on your machine. If any check fails, stop and send the complete output before continuing to another update.

## Safety boundaries

- The actor is resolved from the authenticated active Employee/Doctor session; no client identity or lifecycle fields are accepted.
- A directly targeted referral can be accepted/completed only by that Doctor. A specialty-only referral can be handled by an active Doctor belonging to that specialty.
- Only the originating Doctor employee can cancel an open referral.
- External referrals are not part of the internal Doctor inbox and cannot be accepted/completed by a clinic Doctor.
- Only PENDING → ACCEPTED → COMPLETED and PENDING/ACCEPTED → CANCELLED transitions are permitted.
- Referral row lock, transition, and audit event are committed atomically.
- The inbox returns minimal patient identity and referral context only; it does not grant access to the originating Encounter or full clinical chart.
- No schema, migration, seed, package, dependency, environment, or UI change is included.
- This remains a synthetic-data portfolio/demo application, not production clinical software.
