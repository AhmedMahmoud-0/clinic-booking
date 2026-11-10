# MERUNO Phase 7E — Doctor Prescription Drafts

## Purpose and boundary

This increment implements Doctor-owned prescription draft retrieval, creation, and editing for an active Encounter. It does not issue/sign a prescription, complete an Encounter, or provide clinical decision support. The app remains a synthetic-data portfolio/demo, not production clinical software.

## API contract

| Method | Route | Behavior |
| --- | --- | --- |
| `GET` | `/api/doctor/encounters/:encounterId/prescriptions` | Return minimal prescription DTOs and medication items for the authenticated Doctor's own active Encounter. |
| `POST` | `/api/doctor/encounters/:encounterId/prescriptions` | Create the one editable `DRAFT` for an Encounter, with 1–20 medication items. |
| `PUT` | `/api/doctor/encounters/:encounterId/prescriptions/:prescriptionId` | Replace the full item set and general instructions of the original author's unsigned draft. |

All endpoints use the existing `clinical.encounter.manage` employee permission. Mutation routes require same-origin JSON requests, reject query parameters, and use strict Zod request schemas.

## Prescription item data

The existing `Prescription` and `PrescriptionItem` models are reused. Each item supports:

- Medication name and strength (manual synthetic text; there is no medication catalogue in this increment).
- Dosage, administration route, frequency, and duration in days.
- Optional dispense quantity and required unit when a quantity is supplied.
- Refills and item-level instructions; the parent prescription has general instructions.
- Optional PRN metadata: maximum quantity per dose, unit for that maximum, and maximum number of PRN doses per day.

Medication names, routes, strengths, and dose directions are entered as free text. There is no formulary lookup, drug interaction checker, allergy reconciliation, dose calculator, contraindication checking, or automated prescribing recommendation. Do not interpret an accepted request as clinically validated.

## PRN safety fields and migration 11

`PrescriptionItem` gains:

- `isPrn Boolean NOT NULL DEFAULT false`
- `prnMaxQuantityPerDose DECIMAL(10,2) NULL`
- `prnMaxDoseUnit VARCHAR(40) NULL`
- `prnMaxDosesPerDay INTEGER NULL`

Migration `20261109110000_prescription_prn_safety_fields` adds the columns with a PostgreSQL CHECK constraint. Non-PRN items must keep all PRN maximum fields null. PRN items require a positive maximum quantity per dose, a non-empty unit, and a positive maximum number of doses per day. Existing rows are preserved and default to `isPrn = false`. The migration also checks for duplicate DRAFT prescriptions per Encounter and creates a partial unique index so only one draft can exist for an Encounter. It aborts without merging or deleting rows if duplicate drafts are found.

## Authorization and transaction rules

- Recheck that the authenticated employee is active, has an active `DOCTOR` role assignment, and has a linked DoctorProfile.
- The Encounter must belong to that Doctor, be `IN_PROGRESS` with no completion timestamp, and have a consistent source: Appointment in `IN_CONSULTATION`, or Walk-in QueueEntry in `IN_SERVICE`.
- Conceal another Doctor's Encounter as not found. Do not accept patient, doctor, employee, prescriber, status, issued timestamp, item IDs, or item order from the request.
- Read uses Repeatable Read. Draft create/update uses Serializable with an Encounter row lock; update also locks the Prescription row.
- One editable `DRAFT` per Encounter is enforced by the PostgreSQL partial unique index and the serialized service transaction. Migration 11 first checks for legacy duplicate drafts and fails safely without deleting or merging them. A subsequent create returns conflict; the client must read the existing draft and use PUT.
- A draft can be updated only by its original prescriber, while the Encounter remains in progress and `Prescription.status = DRAFT` with `issuedAt = null`.
- `ISSUED` and `CANCELLED` prescriptions are immutable through these routes. No issue or cancellation endpoint is added.
- Updating a draft replaces its full medication-item set in one transaction. Since this is an unsigned draft, replacement is allowed; the change is captured as a minimal AuditLog event. An identical update returns `UNCHANGED` without another audit event.
- Audit events record the employee, Prescription/Encounter references, item count, and time only. They do not contain medication text, dosage, directions, patient name, or other clinical content.

## Not included

Prescription issuance/signature, cancelling issued prescriptions, amendment/version history, medication catalogue/formulary, pharmacy dispensing, drug interaction or allergy checking, dose calculations, controlled-substance workflows, clinical-note approval/correction, Encounter completion, Doctor UI, Nurse workflows, diagnostic orders, referrals, or follow-up.
