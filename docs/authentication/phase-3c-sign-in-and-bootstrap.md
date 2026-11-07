# Phase 3C — Sign-in, Sign-out, and Initial Admin Bootstrap

## Authentication flow

1. A user opens `/login`.
2. The client submits email/password through the existing Better Auth client and `/api/auth/[...all]` handler.
3. Better Auth validates the credential account and issues its session cookie.
4. The client navigates to `/auth/account-status`.
5. The server reads the current Better Auth session, then checks `EmployeeAccount` and `PatientAccount` links.
6. A verified employee link is displayed only when the employee is ACTIVE and has at least one ACTIVE `EmployeeRoleAssignment`. A patient link is described as verified only when `PatientAccount.verifiedAt` is set.
7. The page does not expose a patient's medical data and does not grant workspace access. Authorization remains a separate server-side decision.

## Initial System Admin bootstrap

The synthetic Phase 2 seed intentionally creates no employee login accounts. Therefore, a controlled first identity is needed before sign-in can be tested.

`scripts/bootstrap-system-admin.ps1` prompts the local operator for a work email, employee number, name, explicit confirmation of mailbox control, and password. It passes the password to the Node bootstrap process through a temporary environment variable, while the PowerShell input itself is a SecureString. The Node script deletes the password environment variable immediately after reading it.

The Node script:

- accepts only a local PostgreSQL host;
- obtains a PostgreSQL advisory transaction lock;
- refuses to run if any SYSTEM_ADMIN assignment already exists;
- checks employee number and email uniqueness;
- uses Better Auth's `hashPassword` function (scrypt-compatible) for the credential account;
- creates Employee, auth_user, auth_account, EmployeeAccount, EmployeeRoleAssignment, and AuditLog in one transaction;
- marks the initial operator-provisioned email as verified based on the operator's attestation that they control the mailbox; this does not enable public sign-up.

This is a local development bootstrap, not a general admin provisioning endpoint and not intended for production execution.

## Deliberately deferred

- Public patient registration and email verification delivery.
- Password reset and email-change workflows.
- Patient identity matching and linking.
- Employee invitation/provisioning after the first administrator.
- Role-aware route and data authorization.
- Adult delegation, legal-guardian checks, and patient access scopes.
