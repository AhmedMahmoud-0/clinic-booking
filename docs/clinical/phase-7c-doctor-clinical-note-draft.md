# Phase 7C — Doctor Clinical Note Draft (Update 56)

## Purpose

Allow the authenticated Doctor to save the initial structured clinical assessment for an already-started Encounter. This is a draft-only workflow. It does not approve or sign a clinical note and does not complete the Encounter.

## Route and authorization

- `PUT /api/doctor/encounters/:encounterId/clinical-note`
- Requires `clinical.encounter.manage` through `withEmployeePermissionRoute`.
- Requires a same-origin JSON request and rejects query parameters.
- The request body is strict. It accepts only `chiefComplaint`, `historyOfPresentIllness`, `clinicalExamination`, `assessment`, and `treatmentPlan`.
- Patient, Doctor, author, Encounter status, note type/status, signature, diagnosis IDs, and timestamps are server-controlled or handled by separate workflows. They cannot be selected by the caller.

## Persistence mapping

The update reuses the Phase 2B models without a schema change:

| Request field | Persisted field |
| --- | --- |
| `chiefComplaint` | `Encounter.chiefComplaint` |
| `historyOfPresentIllness` | `ClinicalNote.subjective` |
| `clinicalExamination` | `ClinicalNote.objective` |
| `assessment` | `ClinicalNote.assessment` |
| `treatmentPlan` | `ClinicalNote.plan` |

The `assessment` field is narrative SOAP assessment text. It does not create a coded `EncounterDiagnosis`; the diagnosis-catalog workflow remains separate.

## Authorization and state rules

- The service rechecks that the employee is active, has an active `DOCTOR` role assignment, and retains a linked `DoctorProfile` inside a Serializable transaction.
- The Encounter must exist, belong to the authenticated Doctor profile, remain `IN_PROGRESS`, and have no `completedAt` timestamp.
- Visit-origin consistency is rechecked: an appointment Encounter must link to one matching appointment in `IN_CONSULTATION`; a walk-in Encounter must link to one matching `WALK_IN` QueueEntry in `IN_SERVICE`.
- The Encounter row is locked before reading or creating the initial assessment note. This serializes concurrent draft upserts for the same Encounter.
- If no `INITIAL_ASSESSMENT` exists, create one with `status = DRAFT` and the authenticated employee as author.
- If exactly one `DRAFT` exists and the same employee authored it, replace its narrative values and update the Encounter chief complaint.
- A draft authored by another employee is not editable. Multiple initial-assessment records or inconsistent signature state fail closed.
- A `SIGNED` note is immutable through this endpoint. Corrections require the separate `ClinicalAmendment` workflow; no amendment is created here.
- A no-change save returns `UNCHANGED` and does not create another audit event.

## Audit and response

- Every actual create/update writes `DOCTOR_CLINICAL_NOTE_DRAFT_SAVED` in the same transaction.
- The audit row contains the employee actor, note entity ID, Encounter ID in a bounded reason, and timestamp. It never copies complaint, history, examination, assessment, or treatment-plan text.
- The response returns only the saved draft fields and the Encounter's status/chief complaint. It does not return raw Prisma objects or patient contact data.

## Deliberately excluded

- No signing, approval, completion, clinical amendment, coded diagnosis, vitals, prescription, lab/radiology orders, referral, follow-up, or Nurse workflow.
- No Doctor UI or client-side autosave.
- No schema, migration, seed, Prisma generation, dependency, package, or environment change.
- No access to an Encounter assigned to another Doctor, and no ability to update a signed note.

All records remain synthetic. MERUNO is a portfolio/demo project, not production clinical software.
