# MERUNO Phase 3G-C — Guardian and Adult Patient Delegation Management

## Status

Update 27 is implemented as a server-side API layer. Local validation by the developer is pending. Apply it on top of the locally verified Update 26 + Fixes 01–03 project.

## Purpose and security boundary

This phase manages explicit access from one existing patient record to another related patient record. It does not delegate employee roles and does not give Reception or System Admin access to clinical records.

The direction is fixed:

- `subjectPatientId`: the patient whose information may be accessed.
- `granteePatientId`: the related patient account receiving the specified access.
- `PatientRelationship.patientId` must equal the subject and `relatedPatientId` must equal the grantee.

A family relationship alone is not permission. A booking or appointment-management task is not medical-record permission. Every actual patient data read must continue to call the existing Phase 3E `requirePatientRecordAccess(patientId, exactScope)` helper and then enforce any domain-specific assignment, record-state, and workflow rules.

## Employee permission

A new static capability, `patient.delegation.manage`, is added to the central permission map for:

- Reception
- System Admin

It is not assigned to Doctor, Nurse, Lab Staff, Radiology Staff, Radiologist, Cashier, or Clinic Manager. It does not add a database role or change any employee's `EmployeeRoleAssignment` rows. System Admin still receives no clinical-record read permission.

## Grant rules

### Common requirements

- Subject and grantee must be different, active Patient records.
- The directed `PatientRelationship` row must already exist.
- The grantee must have an active `PatientAccount` with `verifiedAt` set and a Better Auth user with `emailVerified = true`.
- `dateOfBirth` on the subject patient must exist and produce a valid age; unknown or future dates fail closed.
- A grant must contain at least one unique value from the existing `PatientAccessScope` enum.
- `expiresAt` is required, must include an explicit timezone, must be in the future, and may be no more than 365 days away.
- An active or unexpired pending grant for the same patient pair cannot be duplicated. Revoked, rejected, or expired grants can be reissued against the existing unique pair; the AuditLog retains the lifecycle events.

### Minor subject patient

A grant activates only when the existing directed relationship is marked `isLegalGuardian = true` and has both `guardianVerifiedAt` and `guardianVerifiedByEmployeeId`. The employee creating or updating the grant supplies `verifiedAt` and `verifiedByEmployeeId` for the grant itself. Missing legal-guardian evidence blocks activation. A minor does not require adult-style patient approval.

### Adult subject patient

An adult subject must have an active, verified `PatientAccount`. A staff-created grant starts `PENDING`, even after staff review. Only the authenticated subject patient can approve or reject it through the patient endpoint. The API verifies that the authenticated patient ID exactly equals `subjectPatientId`; a grantee or another patient cannot decide the request.

When staff changes the scopes or expiry of an adult grant, the service clears the previous approval and returns the grant to `PENDING`. The subject must approve the new scope set and expiry before the grant becomes active again.

## Operations and API contracts

### Reception / System Admin

All staff operations require `patient.delegation.manage`. Mutation routes also enforce the existing same-origin check.

| Method and route | Purpose |
| --- | --- |
| `GET /api/clinic/patient-delegations?subjectPatientId=...` | List up to 100 grants for one active subject patient; returns minimal DTOs. |
| `POST /api/clinic/patient-delegations` | Create a new grant or reissue a revoked/rejected/expired grant. |
| `PATCH /api/clinic/patient-delegations/{grantId}` | Replace the exact scope set and expiry. Adult approval is reset; verified minor-guardian grants remain active after staff re-verification. |
| `POST /api/clinic/patient-delegations/{grantId}/revoke` | Revoke a pending or active grant with a required reason. |

Create request body:

```json
{
  "subjectPatientId": "patient-id",
  "granteePatientId": "related-patient-id",
  "scopes": ["VIEW_PROFILE", "BOOK_APPOINTMENTS"],
  "expiresAt": "2027-01-01T12:00:00.000Z",
  "reason": "Verified family relationship"
}
```

Update request body:

```json
{
  "scopes": ["VIEW_PROFILE"],
  "expiresAt": "2027-01-01T12:00:00.000Z",
  "reason": "Updated access requirements"
}
```

Revoke request body:

```json
{ "reason": "Access no longer required" }
```

### Patient portal API

All patient operations require an authenticated, verified, active PatientAccount. Mutation routes enforce same-origin requests. E2E tests derive their Origin from the project `BETTER_AUTH_URL`, so they remain aligned with the canonical origin configured for Better Auth.

| Method and route | Purpose |
| --- | --- |
| `GET /api/patient/delegations` | List outgoing and incoming grants involving only the authenticated patient; indicates whether the subject may decide or revoke each grant. |
| `POST /api/patient/delegations/{grantId}/decision` | Subject adult patient approves or rejects a pending grant. |
| `POST /api/patient/delegations/{grantId}/revoke` | Subject patient revokes their own pending or active outgoing grant. |

Decision request body:

```json
{ "decision": "APPROVE" }
```

or

```json
{ "decision": "REJECT", "reason": "I do not approve this request" }
```

Patient revocation uses the same `reason` body as staff revocation. A patient can decide/revoke only a grant whose `subjectPatientId` matches the authenticated patient identity.

## Lifecycle and access enforcement

- `PENDING`: adult approval is outstanding; the existing Phase 3E policy denies delegated access.
- `ACTIVE`: the grant may be used only for listed scopes, after the existing Phase 3E age/guardian/adult-approval checks.
- `REJECTED`: the subject rejected the pending adult grant; the grant is unusable.
- `REVOKED`: staff or subject patient withdrew the grant; the grant is unusable.
- `EXPIRED`: expiry is reached. The grant listing DTO reports `EXPIRED` as soon as `expiresAt <= now`; the source record may still carry its previous status until reissued. The Phase 3E access policy already denies access at the expiry timestamp and does not depend on a background job.

Every create/reissue, staff scope/expiry update, adult approval/rejection, and revocation writes an `AuditLog` entry. Patient actions use the existing `EXTERNAL` actor type and include the subject patient ID in the audit reason because AuditLog has no patient actor foreign-key column. No raw clinical data is stored in audit details.

## UI boundary

This update provides secured server APIs and minimal DTOs only. It does not create the patient portal screens (Phase 10) or the Reception/System Admin workspace screens (Phase 11). Those UIs must call these APIs rather than writing grants directly from the client.

## Database and dependency impact

- Reuses `PatientAccessGrant`, `PatientAccessGrantPermission`, `PatientRelationship`, `PatientAccount`, and `AuditLog` from Phase 3A.
- No Prisma schema change, migration, seed, database reset, Prisma Client generation, new dependency, package script, or environment variable.
- No change to existing patient-account linking or employee-role assignment rows.

## Validation

After applying the update, run from the project root in this exact order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals are 86 unit tests across 11 files and 22 E2E tests, based on the developer-confirmed Update 26 baseline of 64 unit tests and 17 E2E tests. The local run is authoritative; this package is not considered complete until all five commands pass.
