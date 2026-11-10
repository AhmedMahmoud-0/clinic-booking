# Update 37 — File Guide

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Replace | Adds guardian evidence type/reference and a legacy-verification marker to `PatientRelationship`, with inverse attachment relation. |
| `prisma/migrations/20261108040000_patient_family_relationships_guardian_workflows/migration.sql` | Add | Adds the database enum, columns, evidence FK/index, legacy-row preservation, immutable legacy-marker protection, evidence ownership triggers, and consistency constraint. |
| `src/server/auth/authorization/types.ts` | Replace | Declares read/manage permissions for family relationships. |
| `src/server/auth/authorization/policy.ts` | Replace | Grants the new family relationship permissions to Reception only; leaves all other role grants unchanged. |
| `src/server/patient-management/patient-relationship-validation.ts` | Add | Validates family relationship types and legal-guardian evidence input; rejects unknown fields. |
| `src/server/patient-management/patient-relationship-policy.ts` | Add | Calculates minor eligibility against the clinic-local date; fails closed for invalid/missing/future DOB. |
| `src/server/patient-management/patient-relationship-errors.ts` | Add | Defines operation-specific, safe domain errors. |
| `src/server/patient-management/patient-relationship-http.ts` | Add | Maps domain and Prisma conflicts into no-store JSON responses. |
| `src/server/patient-management/patient-relationships.ts` | Add | Implements directed relationship list/create, evidence-backed verification, revocation, grant revocation, and audit writes within transactions. |
| `src/app/api/clinic/patients/[patientId]/relationships/route.ts` | Add | Reception-protected list/create API. |
| `src/app/api/clinic/patients/[patientId]/relationships/[relationshipId]/guardian-verification/route.ts` | Add | Reception-protected legal-guardian verify/revoke API; mutations enforce same-origin checks. |
| `tests/unit/patient-relationship-validation.test.ts` | Add | Tests allowed relationship/evidence values and strict request shapes. |
| `tests/unit/patient-relationship-policy.test.ts` | Add | Tests 18-year boundary and fail-closed date handling. |
| `tests/unit/patient-relationship-permission.test.ts` | Add | Tests Reception-only permissions and separation from System Admin delegation management. |
| `tests/unit/patient-relationship-migration.test.ts` | Add | Tests migration evidence, legacy exception, trigger/FK, and Prisma index contract. |
| `tests/e2e/patient-family-relationships.spec.ts` | Add | Tests unauthenticated access boundaries and no-store headers for all four operations. |
| `docs/patients/phase-5e-family-relationships-guardian-verification.md` | Add | Records data direction, evidence rules, revocation behavior, endpoints, permissions, and migration details. |
| `docs/implementation-roadmap.md` | Replace | Records Phase 5E-1 as pending local migration/verification and keeps Phase 6 blocked until Phase 5E is complete. |
| `README.md` | Replace | Updates project phase status and current Update 37 scope. |
| `APPLY_UPDATE_37.md` | Add | Gives exact apply, migration, and five-check instructions. |
| `UPDATE_37_FILE_GUIDE.md` | Add | Explains each changed file. |
| `UPDATE_37_SUMMARY.txt` | Add | Summarizes scope and operational requirements. |

## Important design boundaries

- `PatientRelationship` stores a directed relationship from the subject patient to the related person. The reverse direction is not stored automatically; it may be recorded separately from the other subject patient's file when needed.
- A family link does not grant patient-account, portal, booking, or medical-record access.
- Guardianship is a separate verified state; a family type such as `PARENT` is not sufficient by itself.
- Only Reception receives the new family relationship capabilities in this increment.
- New verification requires an existing private patient document for the same patient. Legacy verified records are explicitly grandfathered and remain distinguishable from new evidence-backed verification.
- Revocation clears guardian state and active/pending delegated grants in one transaction. Any future grant must be explicitly reissued.
- No screens, patient-account linking, relationship correction/deactivation, or full family self-service UI are included.
