# Update 38 — File guide

## Database

- `prisma/schema.prisma` — adds `isActive`, `deactivatedAt`, `deactivatedByEmployeeId`, and `updatedAt` to `PatientRelationship`, plus the deactivating employee relation and indexes for actor/history queries.
- `prisma/migrations/20261108050000_patient_relationship_lifecycle/migration.sql` — migration 8 adds lifecycle columns, actor FK, state constraints, index, and a trigger preventing relationship deletion and preventing reactivation or mutation after deactivation. Existing records default to active.

## Patient relationship API and service

- `src/server/patient-management/patient-relationship-validation.ts` — adds strict correction/deactivation request schemas with bounded reason-code catalogs. Free-text notes are rejected.
- `src/server/patient-management/patient-relationships.ts` — returns active/inactive relationship state; corrects relationship type with an audit event; soft-deactivates the row and atomically revokes linked pending/active grants; requires active relationships for guardian verification.
- `src/app/api/clinic/patients/[patientId]/relationships/[relationshipId]/route.ts` — Reception-protected PATCH endpoint for relationship-type correction.
- `src/app/api/clinic/patients/[patientId]/relationships/[relationshipId]/deactivate/route.ts` — Reception-protected POST endpoint for soft deactivation.

## Access and consent safeguards

- `src/server/auth/authorization/delegation-policy.ts` — fails closed when the underlying family relationship is inactive, including adult-approved grants.
- `src/server/auth/authorization/patient-access.ts` — loads the relationship active flag and passes it to the delegated-access policy.
- `src/server/auth/delegation/patient-delegation.ts` — prevents new or renewed delegation grants on inactive relationships and returns the current relationship active flag in grant lists.
- `src/server/patient-management/patient-consents.ts` — requires the guardian relationship to remain active before accepting a guardian-signed minor consent.

## Tests

- `tests/unit/patient-relationship-validation.test.ts` — validates correction and deactivation reason codes and rejects free text/unknown fields.
- `tests/unit/authorization-policy.test.ts` — verifies that inactive relationships cannot authorize either minor guardian grants or adult-approved delegated access.
- `tests/unit/patient-relationship-lifecycle-migration.test.ts` — locks the new migration contract: additive fields, valid lifecycle-state checks, deactivation immutability, and no destructive row operations.
- `tests/e2e/patient-family-relationships.spec.ts` — adds unauthenticated access checks for the two new endpoints.

## Documentation

- `docs/patients/phase-5e-family-relationship-lifecycle.md` — records lifecycle semantics, grant handling, audit minimization, and the terminal deactivation decision.
- `docs/patients/phase-5e-family-relationships-guardian-verification.md` — existing Phase 5E-1 design notes, retained with the lifecycle reference.
- `docs/implementation-roadmap.md` and `README.md` — reflect locally verified Update 37 and prepared/pending Update 38 status.
- `APPLY_UPDATE_38.md` — exact application procedure and migration/test sequence.
- `UPDATE_38_SUMMARY.txt` — compact release summary and expected validation totals.
