# MERUNO Phase 3F — Protected Routes and Authenticated Data Access

## Purpose

Phase 3F turns the Phase 3E authorization primitives into a repeatable server-side pattern for route handlers, workspace entry, and future domain data services. It does not create clinic CRUD workflows or workspace pages; those are implemented in Phases 4–11 with their own assignment, ownership, state-transition, and separation-of-duties rules.

## What Update 23 adds

### 1. Workspace-entry policy

`workspace-policy.ts` defines the minimum capability needed to enter each employee workspace:

- Reception → `patient.basic.read`
- Doctor → `clinical.assigned.read`
- Nurse → `nursing.context.read`
- Laboratory → `laboratory.workflow.manage`
- Radiology → `radiology.workflow.manage` or `radiology.report.approve`
- Cashier → `billing.read`
- Clinic Manager → `operations.report.read`
- System Admin → `system.user.manage`

Radiologist access to the Radiology workspace does not grant the Radiology Staff workflow-management permission. Clinic Manager and System Admin remain separate. A workspace-entry guard is not an operation-level permission check.

### 2. Server workspace guards

`workspaces.ts` exposes:

- `requireEmployeeWorkspace(workspace)` — resolves the current active employee from the Better Auth session/database and checks the workspace policy.
- `requirePatientPortalAccess()` — requires the current verified active patient identity. Individual data reads still require an exact patient-record scope check.

### 3. Route Handler guards

`route-guards.ts` exposes reusable wrappers:

- `withEmployeePermissionRoute(permission, handler, errorMapper?)`
- `withEmployeeWorkspaceRoute(workspace, handler, errorMapper?)`
- `withPatientPortalRoute(handler, errorMapper?)`
- `withPatientRecordRoute(resolvePatientId, scope, handler, errorMapper?)`

Authorization failures are converted to minimal 401/403 JSON responses with `Cache-Control: no-store`. Unexpected errors are rethrown unless the route provides an explicit domain error mapper. The wrappers do not replace input validation, CSRF/origin checks, rate limits where appropriate, or domain-specific authorization.

### 4. Authenticated data-access wrappers

`data-access.ts` exposes:

- `withEmployeeDataAccess(permission, operation)`
- `withPatientRecordDataAccess(patientId, scope, operation)`

These resolve authorization context before invoking the server-side query/mutation. The callback remains responsible for resource assignment/ownership, record state, transaction boundaries, and separation of duties. It must return a minimal DTO, not a raw Prisma record.

### 5. Existing account-linking routes migrated

The employee and patient account-linking Route Handlers now use `withEmployeePermissionRoute` with their existing permissions. The duplicate employee/session/role query helper was removed from `account-linking/common.ts`. Same-origin checks, request validation, audit behavior, and the existing link services remain in place.

## Files added

- `src/server/auth/authorization/workspace-policy.ts`
- `src/server/auth/authorization/workspaces.ts`
- `src/server/auth/authorization/route-guards.ts`
- `src/server/auth/authorization/data-access.ts`
- `tests/unit/workspace-policy.test.ts`
- `docs/authentication/phase-3f-protected-routes-data-access.md`

## Files replaced

- `src/server/auth/authorization/types.ts`
- `src/server/auth/authorization/errors.ts`
- `src/server/auth/authorization/index.ts`
- `src/server/auth/account-linking/common.ts`
- `src/app/api/admin/account-links/employee/route.ts`
- `src/app/api/reception/account-links/patient/route.ts`
- `docs/implementation-roadmap.md`
- `README.md`

## Deliberately not included

- No Prisma schema, migration, seed, or database changes.
- No dependencies or package scripts changed.
- No new clinical APIs or patient/staff workspace pages.
- No broad `middleware.ts` authorization gate. Every sensitive Route Handler, Server Action, and server data service must call its own guard.
- No assumption that workspace access authorizes every action inside that workspace.

## Verification

Run:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The new workspace policy test file contains 11 tests. The prior suite had 24 unit tests after Phase 3E, so the expected total after Update 23 is 35 unit tests across five test files, assuming no local test changes. Existing Playwright coverage is expected to remain 6 tests.

## Security boundary

This remains a portfolio/demo system using synthetic data only. Before each new domain workflow is released, its server data service must add the correct operation permission, record ownership or staff assignment, allowed record state, and separation-of-duties checks. Never accept role, employee ID, patient ID, or permission from client input as proof of access. Never return raw Prisma records to client components.
