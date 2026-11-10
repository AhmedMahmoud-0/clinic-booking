# Phase 5E-1 — Family relationships and legal-guardian verification

## Purpose

This increment adds the server-side registry for directed family relationships and a controlled legal-guardian verification operation. It uses existing patient records and the existing private patient-document upload/download flow. It does not create patient records, patient accounts, portal links, or patient-data grants automatically.

## Relationship direction

A row is recorded from the perspective of the patient whose file is being updated:

- `patientId` is the subject patient whose file records the family relationship.
- `relatedPatientId` is the other person.
- `relationshipType` describes the other person's relationship to the subject patient. For example, a child's record can record a parent using `PARENT`.
- The API creates only the directed row requested and never creates an inverse row automatically. A counterpart can be recorded separately from the other patient's own file when that direction is needed; each direction has its own access-grant meaning.

For guardian verification, the subject patient must be the minor and the related patient must be the proposed guardian; record the relationship from the child's patient file using the appropriate relationship type. The family relationship is not itself proof of legal guardianship. The `isLegalGuardian` designation is set only through the verification endpoint after checking the required evidence.

## Legal-guardian verification

The subject patient must be active and have a recorded date of birth that confirms they are under 18 on the current `Africa/Cairo` date. The related patient must also be active. The verifier must select an existing attachment that:

1. belongs to the subject patient's record;
2. has `Attachment.purpose = PATIENT_DOCUMENT`;
3. is available through the existing Reception-protected document workflow.

The verification request records the evidence category and a foreign-key reference to the attachment. Allowed categories are birth certificate, family registry extract, court order, custody order, and another official document. No national ID/passport number, free-text identity value, or document content is copied into the relationship or audit log.

The database validates the evidence reference and prevents the linked attachment from being deleted, reassigned, or reclassified while referenced. Existing legacy guardian rows with no new evidence pointer are preserved and marked `guardianVerificationLegacy = true`. The database check permits missing evidence only for those grandfathered rows; a trigger prevents ordinary inserts/updates from enabling the marker; new rows use the default `false` and must include both evidence fields. Revocation clears the legacy marker.

## Revocation and delegated access

Revoking guardian verification clears the current guardian state and evidence pointer. In the same transaction, all `PENDING` or `ACTIVE` `PatientAccessGrant` rows for that exact directed relationship are marked `REVOKED`. The previous evidence category/reference and the number of revoked grants are retained in the append-only audit metadata. The attachment itself remains in the patient's document archive.

If guardianship is verified again later, previously revoked grants remain revoked. A staff member must explicitly reissue a grant through the existing Phase 3G-C workflow. That workflow continues to require its own scopes, expiry, verification, and adult-patient approval rules.

## API surface

- `GET /api/clinic/patients/{patientId}/relationships` — Reception-only relationship list, newest first, maximum 100.
- `POST /api/clinic/patients/{patientId}/relationships` — Reception-only directed relationship creation.
- `POST /api/clinic/patients/{patientId}/relationships/{relationshipId}/guardian-verification` — Reception-only legal-guardian verification with evidence type and existing attachment ID.
- `DELETE /api/clinic/patients/{patientId}/relationships/{relationshipId}/guardian-verification` — Reception-only revocation and related grant revocation.

No update/delete endpoint for family links is included in this first increment. Relationship correction/deactivation is retained as remaining Phase 5E work before Phase 6.

## Permissions

- `patient.relationship.read` — Reception only.
- `patient.relationship.manage` — Reception only.
- Existing `patient.delegation.manage` remains separate and is not sufficient to read or modify family identity records. System Admin receives no family-relationship permission.
- No family relationship or guardian flag grants portal or medical-record access on its own.

## Data and migration

Migration: `20261108040000_patient_family_relationships_guardian_workflows` (seventh migration after the six previously confirmed by the developer).

It adds the `PatientGuardianEvidenceType` enum, evidence metadata, and the `guardianVerificationLegacy` marker to the existing `PatientRelationship` model; a restrictive FK to `Attachment`; a unique evidence-attachment index; a same-patient/PATIENT_DOCUMENT validation trigger; and a trigger preventing reassignment/reclassification of a referenced evidence attachment. Existing verified guardian rows are marked as legacy; no relationship row is deleted and no evidence is fabricated. The migration creates the `patientId, createdAt` index in the same ascending order declared in Prisma.

## Not included

No UI, public website, patient portal page, booking authority, automatic account linking, adult-delegation redesign, document scanning, legal decision engine, or legal advice. Clinic staff must inspect the source document under the clinic's own operational procedures. This verification state is an application record, not a legal determination by software.

## Lifecycle continuation — Update 38 / Phase 5E-2

The next increment (`phase-5e-family-relationship-lifecycle.md`) adds correction and soft deactivation without deleting relationship rows. Correcting a currently verified guardian relationship clears the current guardian designation and revokes its active/pending grants so it must be verified again. Deactivation records an employee actor and timestamp, clears current guardian evidence references, revokes every linked pending/active grant, and is terminal in this increment. Delegated-access checks and minor consent signer checks also require the relationship to remain active.
