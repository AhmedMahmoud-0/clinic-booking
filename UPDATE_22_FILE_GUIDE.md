# Update 22 — File-by-file guide

## New authorization modules

| File | Purpose | Main exports / behavior |
| --- | --- | --- |
| `src/server/auth/authorization/types.ts` | Single source for employee role names, patient access scopes, permission names, and typed actor contexts. | `EMPLOYEE_ROLES`, `PATIENT_ACCESS_SCOPES`, `CLINIC_PERMISSIONS`, and authorization context types. |
| `src/server/auth/authorization/policy.ts` | Pure role-to-permission policy. It contains no database access and is safe to unit test. | `ROLE_PERMISSIONS`, `isEmployeeRole()`, `getEmployeePermissions()`, `hasEmployeeRole()`, `hasEmployeePermission()`. |
| `src/server/auth/authorization/delegation-policy.ts` | Pure policy for deciding whether one patient delegation grant can be used for one exact scope. | `isPatientDelegationAllowed()`; handles expiry, revocation, granted scope, age, minor legal-guardian verification, and adult subject approval. |
| `src/server/auth/authorization/errors.ts` | Shared user-safe authorization errors and HTTP response helper. | `AuthorizationError`, `authorizationErrorResponse()`. |
| `src/server/auth/authorization/actor.ts` | Server-only resolver from Better Auth session to current verified clinic identities. | `getCurrentAuthActor()`, `requireAuthenticatedActor()`, `requireEmployeeActor()`, `requireEmployeeRole()`, `requireEmployeePermission()`, `requirePatientActor()`. |
| `src/server/auth/authorization/patient-access.ts` | Server-only query and authorization check for self/delegated patient access. | `requirePatientRecordAccess(patientId, scope)`. Returns whether access is self or delegated and the grant ID when delegated. |
| `src/server/auth/authorization/index.ts` | Server-facing export surface for the authorization layer. | Re-exports the guards, response helper, constants, and context types. |

## Existing files replaced

| File | What changed |
| --- | --- |
| `src/server/auth/account-linking/common.ts` | `getAccountLinkActor()` now accepts a permission and validates it against the shared role-permission matrix instead of receiving a separate allowed-role list. Existing session, active employee, verified link, same-origin, and safe response checks remain. |
| `src/app/api/admin/account-links/employee/route.ts` | Requests `employee.account.link`, which the shared matrix grants only to System Admin. |
| `src/app/api/reception/account-links/patient/route.ts` | Requests `patient.account.link`, which the matrix grants to Reception and System Admin. |
| `docs/implementation-roadmap.md` | Records Parts 1–3, the completed 3A–3D work, the new 3E step, and the remaining 3F/3G and Phases 4–12. |
| `README.md` | Updates project status and the architecture notes to reflect the current authentication/authorization work. |

## Test file

`tests/unit/authorization-policy.test.ts` contains 13 tests covering:

- Reception and System Admin account-link permissions.
- Separation of Clinic Manager from System Admin.
- No default clinical-record access for System Admin or Cashier.
- Radiologist-only radiology report approval.
- Active legal-guardian grant requirements for minors.
- Subject-patient approval for adult delegation.
- Exact granted scopes, expiry, revocation, and missing evidence.

## How later code will use this update

A future server route/service should call `requireEmployeePermission()` or `requireEmployeeRole()` before performing staff work. A patient-data service should call `requirePatientRecordAccess()` for the patient and exact requested scope, then separately check the target record's state and assignment rules. The helper does not authorize all encounters, reports, attachments, or invoices automatically.
