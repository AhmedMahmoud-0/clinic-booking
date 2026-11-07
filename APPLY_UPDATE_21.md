# Apply Update 21 — Phase 3D Account Linking

## Files

Merge the `src` and `tests` folders into the existing project. This update adds new files only; it does not replace existing files.

New files:

- `src/server/auth/account-linking/common.ts`
- `src/server/auth/account-linking/validation.ts`
- `src/server/auth/account-linking/employee-link.ts`
- `src/server/auth/account-linking/patient-link.ts`
- `src/app/api/admin/account-links/employee/route.ts`
- `src/app/api/reception/account-links/patient/route.ts`
- `tests/unit/account-linking.test.ts`
- `docs/authentication/phase-3d-account-linking.md`

## Apply

1. Extract the ZIP into the project root and merge folders when Windows asks.
2. Do not replace `schema.prisma`, `.env`, `package.json`, migrations, or existing auth files.
3. No `npm install`, Prisma generation, migration, seed, or `db push` is required.

## Verify

Run these commands from the project root in PowerShell:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The new unit tests cover the supported patient identifier matching and input validation. Existing E2E tests should remain unchanged.

## Important behavior

- The employee endpoint is `POST /api/admin/account-links/employee` and is restricted to active, verified System Administrators.
- The patient endpoint is `POST /api/reception/account-links/patient` and is restricted to active, verified Reception or System Administrator employees.
- Both endpoints link existing Better Auth users only. They do not create users or enable public sign-up.
- Patient identity matching supports `FULL_NAME`, `DATE_OF_BIRTH`, `PHONE`, and `MRN`. It rejects `NATIONAL_ID`, `PASSPORT`, and `OTHER` because the current Patient schema has no corresponding values to verify.
- Patient identity failures are logged as failed verification events without retaining the submitted identifier values.
- This update provides API/service foundations only. Linking screens remain in the Reception and System Administration UI phases.
