# MERUNO Update70 Fix02 — Restore Patient Permission Compatibility

## Apply

1. Keep the already-applied Update70 Fix01 changes.
2. Extract this ZIP into the MERUNO project root and allow these two files to be replaced:
   - `src/server/auth/authorization/types.ts`
   - `src/server/auth/authorization/policy.ts`
3. Do not rerun or roll back Migration16. This fix has no Prisma schema or migration changes.

## What this fixes

Update70 replaced the shared authorization files with an older permission definition. This fix restores the permission identifiers used by the existing patient contact, consent, document, and relationship routes and tests, while retaining the Update44 appointment overlap permission and the Update70 radiology permissions.

## Permission assignments restored

- Reception: patient contact read/manage, consent read/record, relationship read/manage, and document upload.
- Doctor: consent read/record and patient document read/upload.
- Patient relationship/contact management is not granted to Doctor, Cashier, Clinic Manager, or System Admin.
- System Admin and Clinic Manager do not receive patient clinical-document access.

## Verify

Run from the project root:

```powershell
npm run typecheck
```

If typecheck passes, continue with lint and unit tests. Do not run `db push`, `migrate dev`, or `migrate reset`.
