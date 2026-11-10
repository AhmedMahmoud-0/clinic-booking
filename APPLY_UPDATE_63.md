# Apply Update 63 — Doctor Prescription Issuance

## Before applying

1. Confirm Update 62 is already applied and all five checks passed locally.
2. Keep the existing `.env`, `.git`, `node_modules`, `.next`, and `generated/prisma` directories.
3. Do not reset the database or replace existing migration history.

## Apply files

1. Extract `MERUNO_Update_63_Phase_7J_Doctor_Prescription_Issuance.zip` into the project root (`clinic-booking`).
2. Merge the folders when Windows asks.
3. Replace the files explicitly listed in `UPDATE_63_FILE_GUIDE.md`.
4. Do not replace or delete any file not listed in the guide.

## Validation

Run from the project root, in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected incremental test counts, assuming no unrelated tests are added or removed:

- Unit: 880 tests across 83 files (11 new policy tests).
- E2E: 120 tests (4 new authentication-boundary tests).

No database, Prisma, or seed commands are required. Update 63 does not change `schema.prisma`, create a migration, or change generated Prisma types.

## Important behavior

The issue action accepts only `{}`. It issues a complete 1–20-item DRAFT only when requested by the original prescribing Doctor for their own active Encounter. The server sets `status = ISSUED` and `issuedAt`, then records a minimal audit event in the same transaction. Do not manually edit those fields in the database.

An issued prescription is not editable through the existing draft endpoint. Cancellation, amendments/version history, re-issue, clinical-note signing, and Encounter completion are not included in this increment.

Do not deploy or modify any remote environment as part of this local update. Report the five local command results before proceeding to Update 64.
