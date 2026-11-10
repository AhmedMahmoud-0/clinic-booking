# Update 34 — File-by-file guide

## New server files

| File | Purpose |
|---|---|
| `src/server/patient-management/identity-verification-validation.ts` | Strict Zod contract for two different supported identity elements, plus pure comparison helpers for full name, date of birth, phone, and MRN. Uses the existing Egyptian phone comparison key. |
| `src/server/patient-management/patient-identity-verification.ts` | Loads one active patient, compares both identifiers in memory, writes an `IdentityVerification` row and a minimal `AuditLog` event in one transaction, and returns only a minimal result DTO. |
| `src/app/api/clinic/patients/[patientId]/identity-verifications/route.ts` | Protected POST endpoint using `patient.identity.verify`; parses same-origin JSON through the existing patient-management HTTP helper. |

## Existing authorization files replaced

| File | What changed |
|---|---|
| `src/server/auth/authorization/types.ts` | Adds the typed `PATIENT_IDENTITY_VERIFY` permission constant. |
| `src/server/auth/authorization/policy.ts` | Grants the new permission to Reception, Doctor, Nurse, Lab Staff, Radiology Staff, Radiologist, and Cashier, but not Clinic Manager or System Admin. All existing permission assignments are preserved. |

## Tests

| File | Coverage |
|---|---|
| `tests/unit/patient-identity-verification.test.ts` | 17 cases covering accepted/rejected identifier inputs, no National ID/passport values, exact comparison behavior, Egyptian local/+20 phone equivalence, Arabic digits, MRN normalization, and both-identifiers-required behavior. |
| `tests/unit/patient-identity-verification-permission.test.ts` | Confirms the approved staff roles receive the operation permission and that Clinic Manager/System Admin do not. |
| `tests/e2e/patient-identity-verification.spec.ts` | Confirms an unauthenticated request cannot use the verification endpoint and receives a no-store response. |

## Documentation replaced/added

- `docs/patients/phase-5b-patient-identity-verification.md` — workflow, endpoint contract, accepted identifiers, privacy, and deferred integration points.
- `docs/implementation-roadmap.md` — marks Phase 5A complete and Phase 5B current.
- `README.md` — updates the implementation status and current phase.
- `APPLY_UPDATE_34.md` — apply/verification instructions.
