# MERUNO Phase 11 — Update 79: System Administration

## Objective

Complete the technical System Admin workspace as a separate authority from the Clinic Manager workspace delivered in Updates 77–78. The workspace administers employee role assignments, displays the fixed permission model, reviews safe clinic configuration data and schedules, and provides audit visibility.

## Workspace routes

| Route | Purpose |
|---|---|
| `/system-admin` | Technical administration dashboard and navigation |
| `/system-admin/users` | Employee directory, account-link status, active role assignments, and role grant/revoke actions |
| `/system-admin/roles` | Read-only display of the code-defined role-to-permission matrix |
| `/system-admin/master-data` | Read-only specialty, doctor, service, and doctor-service-price view using the existing Phase 4C endpoint |
| `/system-admin/schedules` | Read-only clinic hours, doctor weekly schedules, and upcoming schedule exceptions |
| `/system-admin/settings` | Honest configuration boundary page; no writable settings are claimed |
| `/system-admin/audit-logs` | Searchable recent audit history |

## API routes

| Route | Method | Permission |
|---|---|---|
| `/api/system-admin/overview` | GET | `system.user.manage` |
| `/api/system-admin/users` | GET | `system.user.manage` |
| `/api/system-admin/users/[employeeId]/roles` | PATCH | `system.role.manage` |
| `/api/system-admin/roles` | GET | `system.role.manage` |
| `/api/system-admin/audit-logs` | GET | `audit-log.read` |
| `/api/system-admin/schedules` | GET | `clinic.master-data.manage` |

The catalog page reuses the existing `/api/clinic/master-data` API. It does not duplicate the Phase 4C data service or bypass its authorization/audit rules; this screen is a read-only overview, not a replacement editor.

## Role-management safeguards

- Every role action is authorized server-side with `system.role.manage`; client visibility is not a security boundary.
- The actor employee ID comes from the authenticated authorization context, never from request JSON.
- Changes require a reason and write an `AuditLog` entry in the same serializable database transaction.
- Only active employees may receive a new role assignment.
- System Admin requires a verified employee-account link and verified Better Auth email before assignment.
- `CLINIC_MANAGER` and `SYSTEM_ADMIN` cannot be assigned to the same employee; the two authorities remain separate.
- The last verified, active System Admin assignment cannot be revoked.
- The fixed role/permission matrix is code-defined in the current project. This update displays it read-only; it does not invent a database-backed Role or Permission table.
- Account credentials and passwords are never displayed or changed here. Employee account linking reuses the existing Phase 3D endpoint and exact work-email verification flow.

## Data and privacy boundaries

- The employee list includes only employee identity, work email/account-link verification state, employment status, and role assignment history. It does not return password hashes, sessions, OAuth tokens, or patient data.
- Audit responses are restricted to employee-role/account-link and clinic master-data entities. Patient, appointment, encounter, diagnostic, and billing audit entities are excluded; IP addresses and credentials are never returned.
- Schedule views contain only clinic/doctor availability and employment display data; they do not include patient appointments or clinical data.
- System Admin receives no new clinical-record permissions. Clinic Manager remains an operational role, not a technical administrator.

## Important scope limitations discovered in the existing schema

1. The current Prisma schema has no `Role` or `Permission` model. The authoritative permission matrix is `ROLE_PERMISSIONS`; therefore permission editing and arbitrary custom roles are intentionally not offered.
2. The current Prisma schema has no persisted `SystemSettings` model. The settings route is informational and does not display secrets or present fake save controls. A writable settings feature requires a separate data-contract/schema decision.
3. Existing Phase 4C master-data APIs already support catalog operations and audit recording; this update reuses their read endpoint. This package does not recreate those mutation services.
4. Schedule models exist, but this package provides a safe read-only overview and does not invent a new scheduling mutation contract.

## Database and dependencies

- No Prisma schema changes.
- No migration or seed changes.
- No dependency, package script, environment, or lockfile changes.
- No account/password bootstrap changes.

## Verification

Run from the project root:

```powershell
npm run typecheck
npm run lint
npx vitest run tests/unit/system-admin-policy.test.ts
npx playwright test tests/e2e/system-admin-workspace.spec.ts --workers=1 --reporter=list
npm run build
```

Expected focused coverage: 5 System Admin role-policy unit tests and 2 Playwright access-control tests. Existing full project tests should also remain green.

## Phase 11 position

Update 79 completes the planned technical System Admin workspace foundation after Clinic Manager Updates 77–78. Phase 12 integrated testing and release readiness remains separate and is not claimed complete by this update.
