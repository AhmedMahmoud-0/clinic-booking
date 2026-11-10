# Apply MERUNO Update 36 Fix 02 — Patient Document Permission Test

## Purpose

The developer's latest local run confirms that Update 36 Fix 01 corrected the Windows storage-path test and removed the ESLint warning. The only remaining failed unit test was caused by an incorrect test assumption: it expected every non-Reception employee role to have `patient.basic.read`. `CLINIC_MANAGER` (and `SYSTEM_ADMIN`) intentionally do not have that permission in the approved role matrix.

This fix changes only the unit test so it checks the intended security rule: among non-Reception roles that actually possess `patient.basic.read`, none receives document read or upload automatically. The separate tests continue to assert that Reception alone has document read/upload and that System Admin has neither.

## Apply

1. Keep the current project backup/commit.
2. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
3. Replace this one file only:
   - `tests/unit/patient-document-permission.test.ts`
4. Do not replace the authorization policy, any route, Prisma schema, migration, or other Update 36 Fix 01 file.

## Change details

- Filter the test roles using the actual `ROLE_PERMISSIONS[role]` membership for `PATIENT_BASIC_READ`.
- Exclude Reception from the implication test because Reception has explicit document permissions in this increment.
- Assert both `PATIENT_DOCUMENT_READ` and `PATIENT_DOCUMENT_UPLOAD` remain unavailable to the selected non-Reception roles.
- Assert that the filtered set is non-empty, preventing a vacuous passing test.
- No production authorization behavior changes.

## Database and dependencies

- No Prisma schema change or migration.
- No database command or Prisma Client generation.
- No dependency, package-script, or environment-variable change.

## Validation

Run these five commands in this exact order from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected Unit Test result: 287/287 passed. Expected E2E result: 36/36 passed. The expected results are not a claim that the commands have been executed in the developer's local environment.
