# Update 23 — File-by-file guide

## New authorization modules

| File | Purpose | Main exports / behavior |
| --- | --- | --- |
| `src/server/auth/authorization/workspace-policy.ts` | Pure least-privilege mapping from employee roles to entry into each staff workspace. | `EMPLOYEE_WORKSPACE_PERMISSIONS`, `canAccessEmployeeWorkspace()`. |
| `src/server/auth/authorization/workspaces.ts` | Server-only workspace and patient portal entry guards. | `requireEmployeeWorkspace()`, `requirePatientPortalAccess()`. |
| `src/server/auth/authorization/route-guards.ts` | Standard Route Handler wrappers; resolves the server actor before executing the handler and maps authorization failures to minimal no-store responses. | `withEmployeePermissionRoute()`, `withEmployeeWorkspaceRoute()`, `withPatientPortalRoute()`, `withPatientRecordRoute()`. |
| `src/server/auth/authorization/data-access.ts` | Standard server-only entry point for operation-authorized query/mutation callbacks. | `withEmployeeDataAccess()`, `withPatientRecordDataAccess()`. |

## Existing files replaced

| File | What changed |
| --- | --- |
| `src/server/auth/authorization/types.ts` | Adds typed staff workspace names and `EmployeeWorkspaceAuthorizationContext`; keeps all existing role, permission, and patient-scope values intact. |
| `src/server/auth/authorization/errors.ts` | Adds the stable `INSUFFICIENT_WORKSPACE_ACCESS` authorization error code. |
| `src/server/auth/authorization/index.ts` | Exports the new guards, workspace policy, and data-access wrappers through the authorization package surface. |
| `src/server/auth/account-linking/common.ts` | Removes the duplicated Prisma/session/role lookup. It retains same-origin validation, account-link response helpers, and safe error mapping. |
| `src/app/api/admin/account-links/employee/route.ts` | Uses the shared `employee.account.link` Route Handler guard; the handler receives the verified employee authorization context. |
| `src/app/api/reception/account-links/patient/route.ts` | Uses the shared `patient.account.link` Route Handler guard; existing two-identifier link service behavior is retained. |
| `docs/implementation-roadmap.md` | Marks 3E complete and 3F as the current update. |
| `README.md` | Aligns the status table and architecture summary with Update 23. |

## Tests

`tests/unit/workspace-policy.test.ts` contains 11 tests covering:

- Reception, Doctor, Nurse, Laboratory, Radiology, Cashier, Clinic Manager, and System Admin workspace entry.
- Radiologist entry to the Radiology workspace without granting the Radiology Staff workflow-management capability.
- Separation of Clinic Manager from System Admin.
- Multi-role employee behavior and fail-closed handling of unknown/empty roles.

The new suite is pure policy testing; it does not mock Better Auth or claim to validate every future Route Handler or domain query.

## How future domain code should use this update

- A staff workspace page should call `requireEmployeeWorkspace("DOCTOR")` or its corresponding workspace key in a server layout/page before loading workspace data.
- A Route Handler that performs a specific action should use `withEmployeePermissionRoute()` with the exact action permission, not only a workspace-entry guard.
- A patient portal route should use `withPatientPortalRoute()` for verified portal identity; a particular patient record query must use `withPatientRecordRoute()` or `withPatientRecordDataAccess()` with the exact scope.
- Every callback/service must additionally verify record ownership or staff assignment, record state, business workflow, and separation of duties. It must select and return a minimal DTO rather than exposing raw Prisma records.
