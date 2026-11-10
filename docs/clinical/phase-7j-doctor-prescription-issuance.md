# MERUNO Phase 7J — Doctor Prescription Issuance

## Purpose and scope

This increment adds the issue action for an existing Doctor prescription draft. It reuses the `Prescription` and `PrescriptionItem` records and the existing `DRAFT`, `ISSUED`, and `CANCELLED` statuses. It does not add a medication catalogue, clinical decision support, dispensing, amendment history, or a new database field. MERUNO remains a synthetic-data portfolio/demo and is not production clinical software.

## API contract

| Method | Route | Behavior |
| --- | --- | --- |
| `POST` | `/api/doctor/encounters/:encounterId/prescriptions/:prescriptionId/issue` | Issue the authenticated Doctor's own complete draft. The JSON body must be `{}`. |

The endpoint requires `clinical.encounter.manage`, same-origin JSON, no query parameters, a valid Encounter ID and Prescription ID, and no caller-controlled fields. The employee identity, issuer, status, issue timestamp, and audit actor are resolved or created server-side.

## Issuance policy

- Recheck an active Employee with an active `DOCTOR` role and linked DoctorProfile, the authenticated Doctor's own `IN_PROGRESS` Encounter, and the consistent Appointment (`IN_CONSULTATION`) or Walk-in (`IN_SERVICE`) source within the transaction.
- Lock the Encounter and then the exact Prescription row. The prescription must belong to the Encounter and remain `DRAFT` with a null `issuedAt`.
- Only the original `prescribedByEmployeeId` may issue the draft. Other employees cannot issue it on the author's behalf.
- Require 1–20 existing medication items. Draft creation already validates medication name, dosage, frequency, quantity/unit pairing, PRN maximums, and the item-count bound; the issue service rechecks the persisted item count before changing state.
- Atomically update the row to `ISSUED`, set `issuedAt` from the server clock, and write a minimal `DOCTOR_PRESCRIPTION_ISSUED` AuditLog event in the same Serializable transaction.
- A duplicate issue, cancelled prescription, draft with an issue timestamp, missing prescription, invalid item count, concurrent change, or author mismatch fails without a second issue event.
- Existing draft-update endpoints continue to accept only `DRAFT` rows with null `issuedAt`, so an issued prescription is immutable through draft routes.
- Audit content contains only the employee, Prescription/Encounter references, item count, and timestamp. Medication names, dosages, routes, frequencies, instructions, and patient details are not copied to the audit event.

## Intentionally excluded

Cancellation of issued prescriptions, prescription amendment/version history, prescription re-issue, medication catalogue/formulary, allergy reconciliation, drug-interaction checking, dosage calculation, pharmacy dispensing, controlled-substance handling, clinical-note signing, Encounter completion, Nurse workflows, UI, notifications, schema/migration, seed, dependency, package, or environment changes.
