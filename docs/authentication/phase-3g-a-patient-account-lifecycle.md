# MERUNO Phase 3G-A — Patient Sign-up and Email Lifecycle

## Purpose

This step enables a controlled patient-facing sign-in lifecycle after the Phase 3A–3F authentication and authorization foundation has been verified.

## Included

- Patient sign-in identity registration with name, email, and password.
- Required email verification before Better Auth issues a sign-in session.
- No automatic sign-in immediately after registration.
- Password reset email and reset form. Password reset revokes other active sessions.
- Authenticated password changes require the current password and revoke other sessions.
- Local-only console email transport for development and a Resend HTTP transport for configured environments.

## Critical separation of identity and clinic records

Public registration creates only Better Auth `User` and credential `Account` rows. It does not create `Patient`, `Employee`, `PatientAccount`, `EmployeeAccount`, `EmployeeRoleAssignment`, medical records, or patient access grants.

A patient cannot enter the patient portal or access a medical record until Reception/System Admin links the verified sign-in identity to an existing active Patient through the Phase 3D flow. That flow still requires two distinct supported identity elements and an audit record.

No public endpoint can create or grant an employee role.

## Email delivery modes

### Local development

When `AUTH_EMAIL_MODE` is omitted outside production, the transport defaults to `console`. Verification/reset links are printed to the local development terminal so the developer can test the flow without connecting a mail account. This mode is rejected in production.

### Production

Set the following values in the deployment environment (never commit or send secrets):

```dotenv
AUTH_EMAIL_MODE="resend"
RESEND_API_KEY="<your-resend-api-key>"
AUTH_EMAIL_FROM="MERUNO Medical Clinics <no-reply@your-verified-domain.example>"
```

The sender domain must be verified with the email provider. Production public registration remains disabled when the API key or sender address is missing.

## Deliberately deferred

- Email change and synchronization with `PatientContact` / `Employee.workEmail`; this must include collision checks and current-address approval (Phase 3G-B).
- Employee invitation/provisioning and role assignment (Phase 3G-B).
- Reception/System Admin grant-management UI and APIs.
- Minor-guardian and adult-delegate grant creation, patient approval, scope changes, expiry, revocation, and related audit actions (Phase 3G-C).
- Full Patient Portal account settings navigation and all patient-record workflows (later portal/domain phases).
- SMS/WhatsApp delivery is out of scope.

## Verification boundary

UI tests do not send live email. Use the local console transport to manually open the verification/reset URL and test the Better Auth callback in a local browser. Do not use real patient data. A successful email verification marks the sign-in email as verified; it does not prove the person's clinic identity or link a medical record.
