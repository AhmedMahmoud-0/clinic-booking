# Apply MERUNO Update 36 Fix 01 — Patient Documents

## Why this fix exists

The first local validation of Update 36 reported four failing unit tests and one ESLint warning. The failures had two causes:

1. The Update 36 role matrix unintentionally granted `patient.document.read` and `patient.document.upload` to Doctor, while Phase 5D is explicitly Reception-only for administrative patient attachments.
2. The storage-path unit test expected a POSIX `/tmp/...` string even when running on Windows. The implementation correctly returns the host platform's native absolute path.

The download Route Handler also contained one unused import that ESLint warned about.

## Apply steps

1. Keep your current project backup/commit.
2. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
3. Replace the following files only:
   - `src/server/auth/authorization/policy.ts`
   - `tests/unit/patient-document-storage-path.test.ts`
   - `src/app/api/clinic/patients/[patientId]/documents/[documentId]/route.ts`
   - `README.md`
   - `docs/implementation-roadmap.md`
4. Do not replace any other file from Update 36 or earlier updates.

## What changes

- Reception retains document read/upload permissions.
- Doctor no longer receives administrative patient-document read/upload permissions. Other roles remain unchanged. The document permission constants and role catalog are unchanged.
- The storage-path test now compares against `node:path`'s `resolve()` output, making it portable across Windows and POSIX.
- The unused `patientManagementJson` import is removed from the document download route. Runtime behavior is unchanged.

## Database and dependencies

- No Prisma schema change.
- No migration, database command, seed, or Prisma Client generation.
- No dependency or package-script change.
- No environment variable change.

## Validation

Run these five commands in this exact order from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected result based on the report from the first run: 287/287 unit tests and 36/36 E2E tests pass, with no ESLint warning. This is an expected result, not a claim that the commands have been run in your local environment. No database migration is needed for this fix.
