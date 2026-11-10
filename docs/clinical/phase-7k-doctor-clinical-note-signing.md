# Phase 7K — Doctor Clinical-Note Signing (Update 64)

## Purpose

Allow the original Doctor author to sign the initial assessment draft for their own active Encounter. Signing is separate from completing the Encounter.

## Route and authorization

- `POST /api/doctor/encounters/:encounterId/clinical-note/sign`
- Requires `clinical.encounter.manage` through `withEmployeePermissionRoute`.
- Requires a same-origin JSON request, no query parameters, and a strict empty JSON object.
- The caller cannot choose the ClinicalNote ID, author, signer, status, signature time, clinical content, patient, or Encounter status.

## Eligibility

- Recheck the active Employee, active `DOCTOR` role, linked DoctorProfile, Encounter ownership, `IN_PROGRESS` state, and null `completedAt` inside a Serializable transaction.
- Preserve the existing visit-origin invariant: appointment visits require the matching Appointment in `IN_CONSULTATION`; walk-ins require the matching WALK_IN QueueEntry in `IN_SERVICE`.
- Lock the Encounter before loading its initial assessment, matching the existing draft-save transaction order.
- Require exactly one `INITIAL_ASSESSMENT` note, authored by the current Doctor, with `status = DRAFT` and `signedAt = null`.
- Require a persisted chief complaint and at least one non-empty SOAP section. This only checks structural content presence; it does not decide whether a particular clinical section should have been assessed.

## State change and audit

- Conditionally change the same note from `DRAFT` to `SIGNED` and set `signedAt` using the server clock.
- Write `DOCTOR_CLINICAL_NOTE_SIGNED` to AuditLog in the same transaction. Do not copy clinical narrative into the audit event.
- Repeated signing, author mismatch, duplicate notes, inconsistent state, or concurrent changes fail closed without a second audit event.
- Return the note's existing text fields with the signed status and server-generated timestamp.
- The Encounter remains `IN_PROGRESS`. The endpoint does not complete the visit.

## Deliberately excluded

- No ClinicalAmendment operation is added here. A subsequent amendment workflow must preserve old content, corrected content, reason, actor, and time rather than silently rewriting signed content.
- No Encounter completion, prescription correction/versioning, vitals, referral follow-up, Nurse tasks, Doctor/Nurse UI, schema/migration, seed, dependency, package, or environment change.
- MERUNO remains a synthetic portfolio/demo project, not production clinical software.
