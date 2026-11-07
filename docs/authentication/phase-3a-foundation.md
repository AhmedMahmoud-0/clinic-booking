# MERUNO Phase 3A — Authentication and Authorization Foundation

## Scope

This step adds persistence foundations only. It does not expose login endpoints or allow self-service employee registration.

## Identity model

- `User`: Better Auth login identity and verified email.
- `Session`: active login sessions and device metadata.
- `Account`: credential/provider account data.
- `Verification`: email/password-reset verification tokens.
- `EmployeeAccount`: explicit 1:1 link from auth identity to an existing Employee profile.
- `PatientAccount`: explicit 1:1 link from auth identity to an existing Patient profile.

A `User` may have an employee link, a patient link, or both where appropriate. No email-match-only auto-linking is allowed.

## Employee authorization

`EmployeeRoleAssignment` stores one current assignment for each employee/role pair. Supported roles:

- Reception
- Doctor
- Nurse
- Lab Staff
- Radiology Staff
- Radiologist
- Cashier
- Clinic Manager
- System Admin

Authorization is always server-side and must require all of:

1. A valid Better Auth session.
2. An `EmployeeAccount` link.
3. `Employee.status = ACTIVE`.
4. The required active `EmployeeRoleAssignment`.
5. The specific permission/policy for the operation and resource.

Role values are not accepted from sign-up forms or writable by clients. The first system-admin account will be provisioned through a one-time controlled bootstrap process in a later step.

## Patient authorization and delegation

- `PatientAccount` links a login identity to one existing Patient record.
- `PatientAccessGrant` grants a related patient profile selected scopes to access a patient's information.
- `PatientAccessGrantPermission` stores each granted scope explicitly.
- A grant is not usable unless it is active, not expired, and contains the requested scope.
- The directed relation guarantees the subject patient is `PatientRelationship.patientId` and the grantee is `PatientRelationship.relatedPatientId`.
- A legal guardian grant must have verified legal-guardian metadata and employee verification. Adult delegation requires approval by the subject patient.

The database schema records the relationship and approval actors; the server policy must validate age, legal guardian verification, expiry, revocation, and permitted scopes at the time of every request.

## Security boundaries

- No public route can create an Employee record, EmployeeAccount, or employee role.
- Patient sign-up will create an auth identity only. Linking to a Patient record is a separate verified workflow.
- A Patient relationship alone does not grant data access.
- A Better Auth session alone does not grant access to medical data.
- No sensitive clinical details are copied into Better Auth user/session custom fields.
- Revocations and role changes must be written to `AuditLog`.

## Next implementation step

After applying and validating the schema, wire Better Auth to the existing Prisma 7 client, add the Next.js catch-all handler and server session helpers, and keep sign-up disabled until email verification and patient account-linking policy are configured.
