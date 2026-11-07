# MERUNO Phase 3E — Authorization Core

## Purpose

Phase 3E establishes the shared server-side authorization foundation that later clinic workflows will call. It follows the completed authentication schema, Better Auth integration, sign-in/bootstrap, and account-linking steps (3A–3D).

This update does not build staff workspaces or patient-facing pages. A signed-in user remains only an authenticated identity until the server resolves a verified clinic profile and checks the relevant permission and resource scope.

## What this update adds

### 1. Server-side actor resolution

`getCurrentAuthActor()` reads the Better Auth session and resolves the user against the database. It returns only:

- A verified, active Employee identity with active database role assignments.
- A verified, active Patient identity.
- Both identities only when both explicit links exist and both pass their own checks.

It does not accept role, Employee ID, or Patient ID values from the browser. A missing or unverified link is not treated as a clinic identity.

### 2. Central role and permission policy

`ROLE_PERMISSIONS` defines the current least-privilege capability matrix for the nine approved employee roles. `requireEmployeeRole()` and `requireEmployeePermission()` resolve the current actor from the session and database before allowing server-side work.

Important boundaries:

- System Admin can manage technical users, roles, settings, audit visibility, and employee account links; System Admin receives no clinical-record permission by default.
- Clinic Manager can approve discounts/refunds and oversee operations; Clinic Manager does not receive technical System Admin permissions.
- Radiology Staff can perform the radiology workflow, while report approval belongs to Radiologist.
- Cashier receives billing permissions but no clinical-record permission.
- Role assignment rows in PostgreSQL remain the source of truth. No permission is read from client input.

The matrix is intentionally coarse. Each domain service must additionally verify resource ownership/assignment, record status, separation of duties, and workflow-specific rules. The matrix is not a substitute for those checks.

### 3. Patient self-access and delegated access

`requirePatientActor()` requires an active PatientAccount with a verified link and verified Better Auth email.

`requirePatientRecordAccess(patientId, scope)` allows:

- The patient to access their own linked record.
- A related patient to access another patient's record only when the exact requested scope is present on an active, unexpired, staff-verified grant.

Delegation fails closed unless:

- The relationship is directed from the patient whose data is being accessed to the related patient receiving access (the composite database relation enforces this direction).
- The grant is ACTIVE, not revoked, not expired, and the requested scope is explicitly present.
- For a minor, the grant and legal-guardian relationship both have employee verification metadata.
- For an adult, the subject patient has explicitly approved the grant. Adult approval is not replaced by a family relationship or an employee-created booking.

A family relationship by itself is not permission. Booking an appointment for another person is not permission to view that person's medical record.

### 4. Safe authorization errors

`AuthorizationError` uses stable 401/403 outcomes. `authorizationErrorResponse()` emits a minimal, no-store response without exposing database records or relationship-existence details.

### 5. Existing account-linking endpoints

The employee and patient account-linking APIs now consult the central permission matrix:

- `employee.account.link` — System Admin only.
- `patient.account.link` — Reception or System Admin.

The existing session, active employee, verified link, and same-origin requirements remain in place.

## Files added

- `src/server/auth/authorization/types.ts`
- `src/server/auth/authorization/policy.ts`
- `src/server/auth/authorization/delegation-policy.ts`
- `src/server/auth/authorization/errors.ts`
- `src/server/auth/authorization/actor.ts`
- `src/server/auth/authorization/patient-access.ts`
- `src/server/auth/authorization/index.ts`
- `tests/unit/authorization-policy.test.ts`

## Files replaced

- `src/server/auth/account-linking/common.ts`
- `src/app/api/admin/account-links/employee/route.ts`
- `src/app/api/reception/account-links/patient/route.ts`
- `docs/implementation-roadmap.md`
- `README.md`

## Deliberately not included

- No Prisma schema change, migration, seed, database write, or new dependency.
- No public patient registration, email delivery, email verification UI, password-reset workflow, or employee invitation workflow.
- No account-linking screens or patient delegation-management screens.
- No staff workspace pages, broad route middleware, or business-domain CRUD APIs.
- No blanket permission to read patient records: doctor assignment, clinical record state, result approval/release state, and each domain's resource checks remain mandatory.

These tasks remain in later Phase 3 steps or their corresponding application phases.

## Verification

Run from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The new policy suite adds 13 unit tests. With the 11 unit tests previously reported for Update 21, the expected total is 24 unit tests across four test files, provided no other tests have been added or removed locally.

No Prisma generation or migration is required because the update uses the existing Phase 3A schema.

## Security boundary

This is a portfolio/demo system using synthetic data. The authorization helpers are a shared foundation, not a claim that every future route or data operation is already protected. Every Server Action, Route Handler, and server data service must call the appropriate guard and then enforce the target record's ownership/assignment, workflow state, and business rules independently.
