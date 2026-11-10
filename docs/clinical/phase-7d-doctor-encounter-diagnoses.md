# Phase 7D — Doctor Encounter Diagnoses (Update 57)

## Purpose

Allow the authenticated Doctor assigned to an active Encounter to search the existing diagnosis reference catalogue, view the diagnoses already attached to the Encounter, add a coded catalogue diagnosis, and change which recorded diagnosis is primary.

This is an API/data-layer increment only. It does not provide diagnosis recommendations, free-text coded diagnosis creation, or a clinical coding authority.

## Existing reference data and schema

- Reuse `DiagnosisCatalog` as the active reference catalogue.
- Reuse `EncounterDiagnosis` for each diagnosis recorded against an Encounter.
- Preserve `displayNameSnapshot` at the time the diagnosis is attached.
- Preserve `recordedByEmployeeId` and `recordedAt` when the primary diagnosis changes.
- Reuse the existing PostgreSQL partial unique index `EncounterDiagnosis_one_primary_per_encounter_uq`, which enforces at most one primary diagnosis per Encounter.
- The current seed contains six `MERUNO-DEMO` labels. They are synthetic portfolio placeholders, not ICD-10, SNOMED CT, or another authoritative clinical coding system. The API does not add or invent codes.

## Routes

### `GET /api/doctor/diagnosis-catalog?q=<term>`

- Requires `clinical.encounter.manage` and a current active Doctor employee assignment with a linked DoctorProfile.
- Searches active rows only by display name, code, or description.
- Returns a maximum of 30 minimal catalogue DTOs.
- Allows only one optional `q` parameter, up to 80 characters.

### `GET /api/doctor/encounters/:encounterId/diagnoses`

- Returns diagnosis rows attached to the active, in-progress Encounter assigned to the authenticated Doctor.
- Orders the current primary diagnosis first, then by original record time.
- Returns snapshot display name, catalogue code/system, primary flag, notes, and original recorded time. It never returns raw Prisma records or patient details.

### `POST /api/doctor/encounters/:encounterId/diagnoses`

- Strict JSON body accepts only `diagnosisId`, optional `notes`, and optional `isPrimary`.
- The diagnosis must exist in `DiagnosisCatalog` and remain active.
- Duplicate catalogue diagnoses on the same Encounter are rejected.
- The first diagnosis becomes primary automatically. Later diagnoses are secondary unless `isPrimary: true` is explicitly requested.
- When a new primary is requested, the existing primary is demoted and the new diagnosis is created in the same Serializable transaction.

### `POST /api/doctor/encounters/:encounterId/diagnoses/:encounterDiagnosisId/primary`

- Requires an empty JSON object and promotes only a diagnosis belonging to the path Encounter.
- Demotes the previous primary and promotes the selected diagnosis in one Serializable transaction.
- Repeating the operation for the current primary returns `UNCHANGED` without another audit event.

## Authorization, state, and concurrency

- All routes use the existing `clinical.encounter.manage` employee permission.
- The service rechecks active Employee status, active `DOCTOR` role assignment, and linked DoctorProfile inside the database transaction.
- An Encounter assigned to another Doctor is concealed as not found.
- The Encounter must remain `IN_PROGRESS`, have no completion timestamp, and retain a consistent visit origin: appointment in `IN_CONSULTATION`, or walk-in queue entry in `IN_SERVICE`.
- Mutations lock the Encounter row with `SELECT ... FOR UPDATE` before reading the current diagnosis set. They use Serializable isolation and bounded transaction timeouts.
- The existing partial unique index remains the final database enforcement for at most one primary diagnosis. Prisma uniqueness/serialization conflicts are returned as safe 409 responses.
- Diagnosis rows cannot be deleted or overwritten by this increment. Changing primary status preserves the diagnosis row's original author and recorded time. A dedicated correction/history workflow for wrongly recorded diagnoses remains separate future work.

## Audit

- New diagnosis: `DOCTOR_ENCOUNTER_DIAGNOSIS_ADDED`.
- Primary switch: `DOCTOR_ENCOUNTER_DIAGNOSIS_PRIMARY_CHANGED`.
- Audit rows contain employee actor, diagnosis row/catalogue IDs, Encounter ID, primary transition identifiers, and timestamp only. They do not copy patient details, diagnosis notes, or free-text clinical narrative.
- Audit events are written in the same transaction as the diagnosis mutation.

## Deliberately excluded

- No diagnosis catalogue administration or new diagnosis seed rows.
- No ICD/SNOMED imports, code-system claims, suggestions, or AI diagnosis.
- No free-text diagnosis creation.
- No diagnosis deletion, diagnosis content editing, or correction/amendment history.
- No note signing, Encounter completion, prescriptions, vitals, lab/radiology orders, referrals, follow-up, Doctor UI, or Nurse workflow.
- No Prisma schema, migration, seed, Prisma Client generation, dependency, package, or environment change.

All records remain synthetic. MERUNO is a portfolio/demo application, not production clinical software.
