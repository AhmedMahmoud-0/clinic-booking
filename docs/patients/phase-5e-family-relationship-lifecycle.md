# Phase 5E-2 — Family relationship correction and deactivation

## Purpose and boundary

This increment completes the server-side lifecycle operations for the directed family relationship records introduced in Update 37. It adds controlled relationship-type correction and terminal soft deactivation. It remains a protected API/data-layer increment; user-facing family management screens remain in the later workspace UI phase.

## Correction

`PATCH /api/clinic/patients/{patientId}/relationships/{relationshipId}` accepts only the replacement relationship type and a controlled correction reason code. Free-text notes and identity details are not accepted or written to audit logs. Corrections are allowed only for active relationships and only when the type actually changes.

If the relationship currently carries a verified legal-guardian designation, correcting the relationship type clears that current designation and its evidence pointer and revokes pending/active patient-access grants for that exact directed relationship in the same Serializable transaction. The original evidence attachment remains in the patient's document archive. A new guardian verification must be completed with evidence before a new minor delegation is issued.

Adult grants that were explicitly approved by the subject patient are not automatically revoked merely because the descriptive relationship type is corrected, provided that the relationship itself remains active. This keeps relationship classification separate from adult patient consent.

## Deactivation

`POST /api/clinic/patients/{patientId}/relationships/{relationshipId}/deactivate` accepts a controlled deactivation reason code. It does not delete the relationship row. It records `isActive = false`, the deactivation timestamp, and the employee actor; clears current guardian verification/evidence pointers; revokes every pending or active patient-access grant for the exact directed relationship; and appends a non-PHI audit event—all in one Serializable transaction.

Deactivation is terminal in this increment. The PostgreSQL trigger prevents reactivation or modification of a deactivated row. A later workflow would need to explicitly design and audit a separate reinstatement/versioning model; this increment does not silently revive an old relationship. The unique directed-pair constraint remains in place, so the same pair cannot be re-added as a second row in this increment.

## Access enforcement

The delegated patient-access authorization policy now requires the underlying relationship to be active for both minor guardian grants and adult patient-approved grants. The delegation-creation/renewal workflow also refuses an inactive relationship. Consent signer resolution requires an active verified guardian relationship. These checks are independent of revocation updates, so a stale grant row cannot authorize access through an inactive relationship.

## Audit and data minimization

Correction and deactivation reasons are bounded enum codes, not free text. Audit entries record the prior/new relationship type where relevant, reason code, whether guardian verification was cleared, previous evidence type/reference when applicable, and the number of grants revoked. They do not copy patient names, national ID values, document contents, or arbitrary notes.

The relationship list continues to return inactive rows so Reception can see the historical state, deactivation timestamp, and deactivating employee. The system does not expose the internal legacy-verification marker.

## Database change

Migration: `20261108050000_patient_relationship_lifecycle` (eighth migration). It adds `isActive`, `deactivatedAt`, `deactivatedByEmployeeId`, and `updatedAt`, an employee FK, lifecycle consistency checks, deactivation-actor and active-state indexes, and an immutability/reactivation-prevention trigger. Existing rows receive `isActive = true` and remain active; the migration does not delete or rewrite family relationships or patient grants.

The migration uses additive/idempotent DDL (`ADD COLUMN IF NOT EXISTS`, guarded constraints, and index creation) to make local recovery safer if the migration runner is interrupted. It does not use destructive schema operations.

## Not included

No reactivation, inverse-link automation, account linking, portal screens, booking authority, legal decision engine, changes to adult approval, or automatic grant restoration. No patient or attachment data is deleted.
