# MERUNO Update 57 — Fix 01

## Purpose

Fix the TypeScript employee projection errors and remove one unused import reported after Update 57.

## Files to replace

- `src/server/appointments/doctor-diagnosis.ts`
- `src/app/api/doctor/diagnosis-catalog/route.ts`

## Exact changes

1. Add `id: true` to the shared `employeeSelect` projection. The diagnosis service records the authenticated employee ID as `recordedByEmployeeId` and `actorEmployeeId`; those writes already use `employee.id`, so the identifier must be selected by Prisma.
2. Remove the unused `AccountLinkError` import from the diagnosis-catalog route.

No workflow logic, authorization policy, transaction behavior, DTO, schema, migration, seed, dependency, or package script is changed.

## Apply

1. Keep a backup/commit of the current project state.
2. Extract this ZIP into the existing `clinic-booking` project root.
3. Replace only the two files listed above.
4. Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, or the local PostgreSQL database.

## Verification

Run from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Update 57 previously passed 669/669 unit tests and 96/96 E2E tests. These counts are expected to remain unchanged after this type-only projection and unused-import fix. Production build should now pass the TypeScript stage that previously failed with TS2339.
