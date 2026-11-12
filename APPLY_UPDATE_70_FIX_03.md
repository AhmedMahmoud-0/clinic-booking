# MERUNO Update70 Fix03 — Patient Document Permission Scope

## Apply

1. Keep Update70, Fix01, and Fix02 already applied.
2. Extract this ZIP into the MERUNO project root and replace only:
   - `src/server/auth/authorization/policy.ts`
3. Do not rerun or roll back Migration16. This fix contains no Prisma schema or migration changes.

## Correction

The existing `patient-document-permission.test.ts` establishes that, in this increment, only Reception receives the general patient-document permissions:

- Reception: `PATIENT_DOCUMENT_READ` and `PATIENT_DOCUMENT_UPLOAD`.
- Doctor and all other employee roles: neither general patient-document permission.

This does not alter the separate clinical assignment, encounter, diagnostic-result, or report permissions. It also does not grant document access to System Admin.

## Verify

Run:

```powershell
npm run typecheck
npm run lint
npm test
```

Expected: the patient document permission tests should pass along with the previously passing tests. Continue to Playwright and build only after all unit tests pass.
