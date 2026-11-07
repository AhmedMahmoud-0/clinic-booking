# MERUNO Phase 3D — Account Linking

## Scope

This update implements the server-side workflows that connect an existing Better Auth identity to an existing clinic record. It does not create public accounts, add registration screens, or build the reception/admin UI. Those interfaces remain in their scheduled phases.

No Prisma schema change or migration is required; Phase 3A already created the required identity-link and verification models.

## Employee account linking

Endpoint: `POST /api/admin/account-links/employee`

Requirements:

- Caller must have a valid Better Auth session.
- The session must resolve to an `EmployeeAccount` whose `verifiedAt` is set.
- The linked employee must be `ACTIVE` and have an active `SYSTEM_ADMIN` assignment.
- The target Better Auth user must already exist and have `emailVerified = true`.
- The target Employee must be active and `Employee.workEmail` must match the verified Better Auth email, ignoring email case.
- Neither the User nor Employee may already be linked to another employee account.
- A reason is mandatory and recorded in `AuditLog`.

Example JSON body:

```json
{
  "email": "doctor@example.com",
  "employeeId": "the-existing-employee-id",
  "reason": "Employee identity and work email verified by the clinic administrator."
}
```

The employee link is marked verified only after the server has checked the active employee record, verified Better Auth email, and exact work-email match. Role assignment remains a separate operation; linking alone does not grant a workspace role.

## Patient account linking

Endpoint: `POST /api/reception/account-links/patient`

Requirements:

- Caller must have a valid Better Auth session linked to a verified, active Employee.
- Caller must have an active `RECEPTION` or `SYSTEM_ADMIN` assignment.
- The target Better Auth user must already exist and have `emailVerified = true`.
- The target Patient must exist and be active.
- The User and Patient must not already be linked elsewhere.
- Two different identity elements must both match the selected Patient record.
- A verified email address may not already be recorded against a different Patient record.
- A reason is mandatory and recorded in `AuditLog`.

Supported identity elements in this version:

- `FULL_NAME`: exact normalized combination of first, middle (when present), and last name.
- `DATE_OF_BIRTH`: exact valid `YYYY-MM-DD` calendar date.
- `PHONE`: digits-only comparison against one of the Patient's stored phone contacts.
- `MRN`: case-insensitive comparison against the medical record number.

`NATIONAL_ID`, `PASSPORT`, and `OTHER` are deliberately rejected for account linking because the current `Patient` model does not store verifiable values for them. Do not accept an identifier that the server cannot compare with clinic-held data.

On success, the operation:

1. Creates an `IdentityVerification` record with result `VERIFIED`.
2. Adds or verifies the matching Better Auth email as a Patient email contact. It is not made primary automatically.
3. Creates the one-to-one `PatientAccount` link with `verifiedByEmployeeId`.
4. Writes an `AuditLog` record.

On an identifier mismatch, the operation records a `FAILED` IdentityVerification and an audit event, returns a generic mismatch response, and creates no patient-account link. Submitted identifier values are never persisted or written to logs.

Example JSON body:

```json
{
  "email": "patient@example.com",
  "patientId": "the-existing-patient-id",
  "firstIdentifier": { "type": "MRN", "value": "MRN-00125" },
  "secondIdentifier": { "type": "DATE_OF_BIRTH", "value": "1990-05-12" },
  "reason": "Identity confirmed in person at reception."
}
```

## Security controls

- Both mutation endpoints require the configured same-origin `Origin` header.
- Both require a valid Better Auth session and server-side Employee role resolution.
- Authorization uses active database role assignments, not client-supplied role values.
- Responses are marked `Cache-Control: no-store`.
- Database writes and audit events occur in a Prisma transaction.
- Unique constraints remain the final concurrency guard against duplicate links.
- Raw patient identifiers are not echoed, persisted, or logged.
- Public sign-up remains disabled. This update only links existing verified Better Auth users.

## Not included yet

- Patient self-registration or account invitation.
- Email delivery / verification provider configuration.
- Reception or System Admin user-interface screens for account linking.
- Patient guardian/adult delegation grant management and scope enforcement.
- General per-route authorization policies for every clinic workspace.

These are intentionally assigned to later Phase 3 and the relevant patient/reception/admin UI phases.
