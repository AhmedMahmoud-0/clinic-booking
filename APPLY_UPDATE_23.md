# Apply MERUNO Update 23 — Phase 3F Protected Routes and Authenticated Data Access

## What this update does

Update 23 builds on the locally verified Phase 3E foundation:

1. Adds an explicit minimum-permission policy for entry into each staff workspace.
2. Adds server-only guards for staff workspace entry and verified patient-portal identity.
3. Adds reusable Route Handler wrappers for employee permission, employee workspace, patient portal, and exact-scope patient-record access.
4. Adds server-only wrappers for employee-authorized and patient-record-scoped data-access callbacks.
5. Moves the existing employee and patient account-linking APIs onto the shared Route Handler authorization guard, removing duplicate session/role lookup logic.
6. Adds 11 unit tests for workspace-entry policy.

It does not add clinic CRUD workflows, workspace pages, database changes, or dependencies.

## Files to add

- `src/server/auth/authorization/workspace-policy.ts`
- `src/server/auth/authorization/workspaces.ts`
- `src/server/auth/authorization/route-guards.ts`
- `src/server/auth/authorization/data-access.ts`
- `tests/unit/workspace-policy.test.ts`
- `docs/authentication/phase-3f-protected-routes-data-access.md`

## Files to replace

- `src/server/auth/authorization/types.ts`
- `src/server/auth/authorization/errors.ts`
- `src/server/auth/authorization/index.ts`
- `src/server/auth/account-linking/common.ts`
- `src/app/api/admin/account-links/employee/route.ts`
- `src/app/api/reception/account-links/patient/route.ts`
- `docs/implementation-roadmap.md`
- `README.md`

## Apply

1. Make a backup or commit the current working tree.
2. Extract this ZIP into the existing project root and merge folders.
3. Add the six new files at the exact paths listed above.
4. Replace only the eight existing files listed above when Windows asks.
5. Keep your existing `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, and local PostgreSQL database.

## Dependencies and database

- No `npm install` is required; no dependency changed.
- No Prisma Client generation is required; the schema is unchanged.
- No migration, seed, `db push`, reset, or database write is required.

## Verification

Run from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected unit-test count: 35 (24 previously passing + 11 new workspace-policy tests), across five test files, assuming no local tests were added or removed. Existing E2E coverage is expected to remain six tests.

Playwright starts its own HTTPS Next.js server. Do not start another Next dev server on the configured port while E2E tests are running. If you see an "Another next dev server is already running" message, stop the competing PID and retry.

## Security notes

- Workspace access only permits entry to the workspace shell; it does not grant every action inside it.
- Route handlers must use an operation-specific permission guard.
- Patient-record access requires the exact scope; a family relationship or booking authority is not sufficient.
- Each domain data service must still enforce ownership/assignment, record state, transaction and separation-of-duties rules.
- Return minimal DTOs only. Do not return raw Prisma records to client components.
- Do not use middleware or hidden UI controls as the authorization boundary.
