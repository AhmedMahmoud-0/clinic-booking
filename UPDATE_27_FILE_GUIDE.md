# Update 27 — File-by-file guide

## Server authorization and validation

### `src/server/auth/authorization/types.ts` — replace
Adds the `PATIENT_DELEGATION_MANAGE` capability with the runtime value `patient.delegation.manage`. All existing role names, workspaces, patient scopes, and actor/authorization interfaces remain intact.

### `src/server/auth/authorization/policy.ts` — replace
Adds the new grant-management capability to Reception and System Admin only. It is not added to clinical roles, Cashier, or Clinic Manager. It does not grant clinical-record read permissions.

### `src/server/auth/authorization/delegation-policy.ts` — replace
Exports the UTC-based age calculation as `calculatePatientAge` so grant creation/update and the Phase 3E access policy use the same eighteenth-birthday boundary. Existing fail-closed access rules remain unchanged.

### `src/server/auth/delegation/patient-delegation-validation.ts` — add
Defines strict Zod contracts for create, update, adult decision, and revoke inputs. Scope lists must be non-empty and unique. Expiry must be an ISO timestamp with a timezone, in the future, and no more than 365 days away.

### `src/server/auth/delegation/patient-delegation.ts` — add
Contains the server-only grant lifecycle service:

- Creates/reissues grants only for active patient records connected by the exact directed PatientRelationship.
- Requires a verified PatientAccount for the grantee and, for an adult subject, a verified PatientAccount for the subject.
- Activates minor grants only after staff-verified legal guardianship; keeps adult grants pending for subject-patient approval.
- Lists staff grants and patient incoming/outgoing grants as minimal DTOs rather than raw Prisma records.
- Updates scopes/expiry transactionally; adult updates clear the previous approval and return the grant to pending.
- Allows adult subject patient approve/reject and allows staff/subject patient revoke within their respective authority.
- Uses serializable transactions and writes AuditLog events.

## Route Handlers

### `src/app/api/clinic/patient-delegations/route.ts` — add
`GET` lists grants for a supplied `subjectPatientId`; `POST` creates or reissues a grant. Both require `patient.delegation.manage`, and mutation requests require same-origin validation.

### `src/app/api/clinic/patient-delegations/[grantId]/route.ts` — add
`PATCH` replaces scopes and expiry. An adult grant returns to pending until the subject patient approves the changed terms.

### `src/app/api/clinic/patient-delegations/[grantId]/revoke/route.ts` — add
Staff revocation for a pending or active grant with a required reason.

### `src/app/api/patient/delegations/route.ts` — add
Lists only incoming/outgoing grants involving the authenticated patient identity.

### `src/app/api/patient/delegations/[grantId]/decision/route.ts` — add
Allows only the authenticated adult subject patient to approve or reject a pending grant.

### `src/app/api/patient/delegations/[grantId]/revoke/route.ts` — add
Allows only the subject patient to revoke their own pending or active outgoing grant.

## Tests

### `tests/unit/patient-delegation-validation.test.ts` — add
Covers scope validation, duplicate and unknown scopes, subject/grantee separation, timestamp timezone, reasons, decisions, and the one-year expiry boundary.

### `tests/unit/patient-delegation-age.test.ts` — add
Covers the eighteenth-birthday boundary, missing date of birth, invalid dates, and future dates.

### `tests/unit/authorization-policy.test.ts` — replace
Preserves the existing Phase 3E policy tests and adds checks that Reception and System Admin can manage patient delegation while unrelated roles cannot.

### `tests/e2e/patient-delegation.spec.ts` — add
Checks that staff grant listing/creation and patient grant listing/decision/revocation are inaccessible without an authenticated verified clinic identity. The Origin header is derived from `BETTER_AUTH_URL`, matching the Playwright and Better Auth origin rather than hardcoding localhost. Responses must remain no-store.

## Documentation

### `docs/authentication/phase-3g-c-patient-delegation-management.md` — add
Documents the direction of the relationship, age-specific approval rules, endpoint contracts, grant lifecycle, audit behavior, UI boundary, and schema/dependency impact.

### `docs/implementation-roadmap.md` — replace
Marks Update 26 and Fix 03 as complete based on the developer's confirmed 64-unit/17-E2E result, and marks Update 27 as the current Phase 3G-C update pending local verification.

### `README.md` — replace
Aligns the project overview and phase status with the newly delivered delegation API.

## Files deliberately untouched

No changes to Prisma schema/migrations, Better Auth configuration, patient/employee account linking, email delivery, employee invitations, account sessions, or package dependencies/scripts.
