# MERUNO Phase 7G — Doctor Radiology Orders

## Scope

Update 60 adds Doctor-only radiology catalogue search, Encounter-scoped radiology order history, and atomic creation of an immediate `ORDERED` radiology request. This is an API/data-layer increment only; it does not add Doctor UI or radiology operations/scheduling screens.

## Endpoints

### `GET /api/doctor/radiology-catalog?q=...`

- Requires `clinical.order.create` and an active Employee with an active `DOCTOR` role plus a linked DoctorProfile.
- Accepts only one optional `q` parameter, trimmed and limited to 80 characters.
- Searches active `RadiologyProcedure` records by name, code, or description; returns at most 30 minimal catalog DTOs.
- Catalog records are limited by the existing schema to `DIGITAL_XRAY` and `ULTRASOUND`. The catalog does not include CT, MRI, mammography, echocardiography, PACS, DICOM, or device integrations.
- Catalog DTOs expose the procedure code/name, modality, description, default duration, preparation instructions, current catalog price, and currency. Catalog labels are reference data, not medical advice.

### `GET /api/doctor/encounters/:encounterId/radiology-orders`

- Requires `clinical.assigned.read`.
- Returns only radiology orders attached to an Encounter owned by the authenticated Doctor.
- The Encounter must be `IN_PROGRESS`, have no completion timestamp, and have a consistent visit origin.
- Appointment origin must match Encounter patient/Doctor and remain `IN_CONSULTATION`. Walk-in origin must match Encounter patient/Doctor and remain a `WALK_IN` QueueEntry in `IN_SERVICE`.
- The DTO contains the order header, item status, price/currency snapshot, procedure summary, and any recorded order-time X-ray screening decision. It does not expose exam scheduling, equipment/resource IDs, reports, report findings, or patient contact data.

### `POST /api/doctor/encounters/:encounterId/radiology-orders`

- Requires `clinical.order.create`, same-origin JSON mutation validation, and no query parameters.
- Accepts 1–10 unique active `RadiologyProcedure` IDs only.
- Priority is limited to `ROUTINE` or `URGENT`. Clinical notes are optional and limited to 1,000 characters.
- The request cannot supply Patient/Doctor/Employee IDs, procedure labels, modality, prices, currency, order reference, order/item states, resource IDs, schedule times, exam metadata, or timestamps.
- Creates a `RadiologyOrder` with status `ORDERED`; each `RadiologyOrderItem` begins as `PENDING`.
- Item price and currency are taken from the active catalogue and copied into the historical `priceSnapshot` and `currencyCode`.
- No `RadiologyExam` is created at order time and no room/equipment is reserved. Scheduling and resource assignment remain later Phase 8 work.

Strict JSON example for an X-ray order:

```json
{
  "procedureIds": ["active-digital-xray-procedure-id"],
  "priority": "ROUTINE",
  "clinicalNotes": "Optional bounded clinical indication",
  "xrayPregnancyAssessment": {
    "assessment": "SCREENING_REQUIRED"
  }
}
```

For an order where formal screening is assessed as not indicated, `assessment` must be `NOT_INDICATED` and `notes` must contain the clinical rationale. For ultrasound-only orders, omit `xrayPregnancyAssessment`.

## Order-time X-ray screening decision and Migration 12

The formal `RadiologyPregnancyScreening` record belongs to `RadiologyExam`, which is created during the later examination workflow. It therefore cannot serve as the physician's order-time workflow decision. Migration 12 (`20261109223000_radiology_order_pregnancy_assessment`) adds separate pre-order fields to `RadiologyOrderItem`:

- `preOrderPregnancyAssessment` (`SCREENING_REQUIRED` or `NOT_INDICATED`)
- `preOrderPregnancyAssessmentNotes`
- `preOrderPregnancyAssessedByEmployeeId`
- `preOrderPregnancyAssessedAt`

For each new `DIGITAL_XRAY` item, the ordering Doctor must record one of two order-time decisions:

- `SCREENING_REQUIRED` — the formal pregnancy screening must be completed by the radiology team before the examination.
- `NOT_INDICATED` — the ordering clinician records that formal screening is not indicated and supplies a clinical rationale.

The system records the decision without inferring applicability from age or gender and without inventing an age cutoff. It deliberately does **not** use the formal screening outcomes (`NEGATIVE`, `POSITIVE`, `DECLINED`, `NOT_APPLICABLE`) at order time. Those results belong to the separate `RadiologyPregnancyScreening` record associated with an actual `RadiologyExam`.

The decision is saved with the actor and timestamp on every X-ray item. PostgreSQL checks keep the decision/actor/time fields consistent, require a reason for `NOT_INDICATED`, and require the assessor to match the Doctor who authored the radiology order. A trigger requires a decision for new digital-X-ray items and forbids these X-ray-only fields on ultrasound items. Existing historical order items are not backfilled or rewritten.

**Important distinction:** `SCREENING_REQUIRED` does not mean that pregnancy has been confirmed or excluded. It is a workflow instruction to complete the formal screening before the exam. This order endpoint does not create a screening result or make a clinical decision about alternative imaging. The later imaging workflow must prevent X-ray examination until its required `RadiologyPregnancyScreening` is complete.

## Authorization, transactions, and audit

- Resolve the current employee from the authenticated server actor. Recheck active employee status, active `DOCTOR` role assignment, and linked DoctorProfile within the data service.
- Recheck Encounter ownership, editable state, and source consistency inside the transaction. Other Doctors' Encounters are concealed as not found.
- Lock the Encounter row before writes and create the order header, items, X-ray assessments, and audit event in one Serializable transaction.
- Use server-generated order references and catalog-controlled price snapshots.
- Audit `DOCTOR_RADIOLOGY_ORDER_CREATED` with the actor, order/Encounter references, item count, X-ray item count, and priority only. Do not copy patient identifiers, clinical notes, or assessment notes into AuditLog.
- Multiple separate orders can be created for one Encounter. No persistent idempotency token is added; the eventual UI should prevent accidental repeated submission.

## Not included

- Radiology scheduling, equipment/resource selection, conflict resolution, room allocation, or creation of `RadiologyExam`.
- Exam-day patient identity/preparation checks, `RadiologyPregnancyScreening`, examination performance, report drafting, radiologist review/approval, release, critical-result communication, or ordering-clinician review.
- Order editing, cancellation, re-issue, billing, patient portal result access, external radiology referrals, or manual/free-text procedures.
- Doctor/Nurse UI, Nurse workflows, PACS/DICOM, CT/MRI/mammography/echocardiography, device integration, seed changes, or new dependencies.

This remains a portfolio/demo system using synthetic data only, not production clinical software.
