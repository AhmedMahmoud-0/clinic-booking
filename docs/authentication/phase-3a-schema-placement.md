# MERUNO Phase 3A — Authentication Schema Placement

This guide is for applying `prisma/phase-3a-auth-schema-fragment.prisma` to the existing `prisma/schema.prisma` without replacing the existing clinical schema.

## 1. Add the enum declarations

Copy the four enum declarations from the fragment into the enum section near the top of `prisma/schema.prisma`. Do not place them inside a model.

## 2. Add inverse fields to existing models

Add the following fields to the named existing models. Each field must be inside the model braces and must appear only once.

### `Employee`

```prisma
authAccount EmployeeAccount? @relation("EmployeeAuthAccount")
linkedEmployeeAccounts EmployeeAccount[] @relation("EmployeeAccountLinker")
verifiedPatientAccounts PatientAccount[] @relation("PatientAccountVerifier")
roleAssignments EmployeeRoleAssignment[] @relation("EmployeeRoleAssignments")
grantedRoleAssignments EmployeeRoleAssignment[] @relation("EmployeeRoleGrantors")
revokedRoleAssignments EmployeeRoleAssignment[] @relation("EmployeeRoleRevokers")
requestedPatientAccessGrants PatientAccessGrant[] @relation("PatientAccessGrantEmployeeRequester")
verifiedPatientAccessGrants PatientAccessGrant[] @relation("PatientAccessGrantVerifier")
```

### `Patient`

```prisma
authAccount PatientAccount?
accessGrantsAsSubject PatientAccessGrant[] @relation("PatientAccessGrantSubject")
accessGrantsAsGrantee PatientAccessGrant[] @relation("PatientAccessGrantGrantee")
approvedAccessGrants PatientAccessGrant[] @relation("PatientAccessGrantPatientApprover")
```

### `PatientRelationship`

```prisma
accessGrants PatientAccessGrant[]
```

The `PatientAccessGrant.relationship` composite relation references the existing unique key `[patientId, relatedPatientId]`. It deliberately encodes the confirmed direction: `patientId` is the subject of the access; `relatedPatientId` is the patient profile receiving delegated access.

## 3. Append the models

Copy all model declarations from the fragment beginning at `model User` through `model PatientAccessGrantPermission` to the end of `prisma/schema.prisma`.

Do not copy the explanatory comments describing the inverse relation fields as if they were actual fields. Add the actual fields from section 2 separately.

## 4. Important behavior

- `User` is a Better Auth identity, not a Patient or Employee record.
- `EmployeeAccount` and `PatientAccount` are explicit one-to-one links. Both can exist for the same `User` only when a person legitimately has both roles in the clinic.
- A patient account must not be linked to an existing medical record solely because an email address matches. The linking workflow must verify the patient using the clinic's identity-verification process.
- Employee accounts are provisioned by an authorized clinic administrator. Public self-registration must never create or link an Employee account.
- An employee is not authorized merely because a Better Auth user exists. Server authorization must also verify the Employee link, `Employee.status = ACTIVE`, and an active `EmployeeRoleAssignment`.
- The role assignment row is the current state for each employee/role pair. Record every grant/revoke operation in `AuditLog`.
- Patient delegation is inactive by default. Server authorization must require `PatientAccessGrant.status = ACTIVE`, an unexpired grant, and the requested `PatientAccessScope`.
- For a minor's legal guardian, server policy must verify that the relationship points from subject patient to grantee patient and `isLegalGuardian = true`, with the existing guardian verification metadata present. For adult delegation, approval must come from the subject patient. The database schema alone does not prove legal consent.
- Account deletion is restricted by the link relations. Prefer disabling/revoking access and preserving the clinic's audit trail rather than deleting identity/profile history.

## 5. Migration

This is an incremental schema change. Do not run `db:migration:preview`; that script is reserved for rebuilding the initial migration draft.

After the schema is updated and dependencies are installed, validate and generate the client, then create a new migration with the command in `APPLY_UPDATE_14.md`.
