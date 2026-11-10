# Phase 7L — Doctor Clinical-Note Amendments (Update 65)

## Purpose

Allow the original Doctor author to append a documented correction to their signed initial assessment without rewriting the signed `ClinicalNote` row. This increment uses the existing Phase 2B `ClinicalAmendment` model; it does not add a migration or change the Prisma schema.

## Routes and permissions

- `GET /api/doctor/encounters/:encounterId/clinical-note/amendments`
  - Requires `clinical.assigned.read`.
  - Returns the immutable original snapshot, the effective corrected snapshot, and the append-only amendment chain.
- `POST /api/doctor/encounters/:encounterId/clinical-note/amendments`
  - Requires `clinical.encounter.manage`.
  - Requires same-origin JSON, no query parameters, and a strict request containing `reason` and at least one supported field under `changes`.

Both routes re-resolve the active Doctor, linked DoctorProfile, Encounter ownership, and original note authorship in the service layer. A Doctor may amend only their own signed `INITIAL_ASSESSMENT` note for their Encounter. Foreign Encounters are concealed as not found. No Nurse, Reception, or patient route is introduced.

## Amendment snapshot contract

`ClinicalAmendment.previousContent` and `correctedContent` store JSON snapshots with this versioned shape:

```json
{
  "version": 1,
  "chiefComplaint": "...",
  "historyOfPresentIllness": null,
  "clinicalExamination": null,
  "assessment": "...",
  "treatmentPlan": null
}
```

The original snapshot is composed from `Encounter.chiefComplaint` and the signed `ClinicalNote` SOAP fields. Later corrections use the most recent `correctedContent` as the next `previousContent`. The service validates the complete chain before returning it or appending another correction. The client submits only changed fields; the server creates both snapshots and sets `createdByEmployeeId` and `createdAt`.

Optional SOAP fields can be cleared with `null` or blank text, which is normalized to `null`. The chief complaint cannot be cleared, and the resulting note must retain at least one non-empty SOAP section. A no-op correction returns `UNCHANGED` and creates neither an amendment row nor an audit event.

## Immutability and transaction rules

- The signed `ClinicalNote` is never updated by this increment. Its `status` remains `SIGNED` and its original `signedAt` remains unchanged.
- A correction is appended to `ClinicalAmendment` with previous snapshot, corrected snapshot, reason, authenticated Doctor employee, and server-generated timestamp.
- Multiple corrections form a validated chain. A malformed or broken stored chain fails closed; it is never silently repaired or rewritten.
- The Encounter is locked before its initial assessment note is locked, following the existing Doctor clinical-note transaction lock order. Amendment creation uses a Serializable transaction.
- In-progress Encounters must have a consistent active visit source. Completed Encounters may also be amended when the completed timestamp and Appointment/Walk-in lifecycle agree. Cancelled or inconsistent Encounters are rejected.
- A PII-/clinical-content-minimal `DOCTOR_CLINICAL_NOTE_AMENDED` audit event is written in the same transaction. Clinical snapshots and the amendment reason are not copied into the audit row.

## Validation and responses

- Only `chiefComplaint`, `historyOfPresentIllness`, `clinicalExamination`, `assessment`, and `treatmentPlan` can be corrected.
- `reason` is required and bounded to 1,000 characters.
- The caller cannot submit previous/corrected snapshots, employee/author IDs, timestamps, note status, signer, patient ID, or Encounter state.
- Snapshot history must use the known version-1 shape and each `previousContent` must match the prior effective snapshot exactly.
- Duplicate initial notes, unsigned notes, inconsistent signature state, author mismatch, malformed amendment history, concurrent change, and inconsistent Encounter lifecycle fail closed.

## Not included

- No direct mutation of the signed `ClinicalNote` row.
- No amendment workflow for diagnoses, prescriptions, laboratory orders, radiology orders, or referrals.
- No Encounter completion operation, VitalSign workflow, Nurse task workflow, referral follow-up, Doctor/Nurse UI, patient portal display, schema/migration, seed, dependency, package, or environment change.
- This remains a synthetic-data portfolio/demo project, not production clinical software.
