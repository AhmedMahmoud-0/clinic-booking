# MERUNO — Update 79 Fix 01

## Purpose

Corrects the TypeScript narrowing error in the Clinic Manager E2E test, removes the three React lint violations in System Admin data loading, and makes the anonymous System Admin page-protection E2E check assert the server redirect directly instead of relying on a browser navigation that timed out after the redirect had already been emitted.

## Apply

1. Extract this ZIP at the root of the `clinic-booking` project.
2. Preserve the folder structure shown in the archive.
3. Replace the three files at these exact paths:
   - `src/components/system-admin/system-admin-views.tsx`
   - `tests/e2e/clinic-manager-operations.spec.ts`
   - `tests/e2e/system-admin-workspace.spec.ts`
4. Do not replace any other project files.

## Protected scope

This fix does not modify `.env`, `.git`, `node_modules`, `.next`, generated Prisma files, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, or `prisma7.config.ts`.

## Database and dependencies

- No Prisma schema changes.
- No migrations.
- No database operations.
- No dependency or package-manifest changes.
- No environment-variable changes.

## Verification

Run these commands from the project root, one at a time:

```bash
npm run typecheck
npm run lint
npx vitest run tests/unit/system-admin-policy.test.ts
npx playwright test tests/e2e/system-admin-workspace.spec.ts --workers=1 --reporter=list
npm run build
```

The Clinic Manager E2E file is also corrected by this fix; it can be checked separately with:

```bash
npx playwright test tests/e2e/clinic-manager-operations.spec.ts --workers=1 --reporter=list
```
