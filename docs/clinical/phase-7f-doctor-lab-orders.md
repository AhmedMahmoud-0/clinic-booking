# MERUNO Phase 7F — Doctor Laboratory Test Orders

## Scope

Update 59 adds server-side Doctor access to the active laboratory-test catalogue, read access to the authenticated Doctor's Encounter lab orders, and immediate creation of an `ORDERED` lab request. This is an API/data-layer increment; no Doctor UI is added.

## Endpoints

### `GET /api/doctor/lab-catalog?q=...`

- Requires `clinical.order.create` and an active employee with an active `DOCTOR` role plus a linked DoctorProfile.
- Accepts only one optional `q` parameter, trimmed and limited to 80 characters.
- Searches active `LabTest` rows by name, code, or description; returns at most 30 minimal entries.
- Catalog DTOs include test code/name, specimen type, fasting requirement, preparation instructions, default turnaround time, and the catalog price/currency. Catalog text is reference data, not medical advice.

### `GET /api/doctor/encounters/:encounterId/lab-orders`

- Requires `clinical.assigned.read` and an active Doctor identity; the data service independently verifies Encounter ownership and state.
- Returns only orders attached to an Encounter owned by the authenticated Doctor.
- Encounter must be `IN_PROGRESS`, have no completion timestamp, and have a consistent appointment or walk-in origin.
- Appointment origin must match the Encounter patient/Doctor and remain `IN_CONSULTATION`. Walk-in origin must match the Encounter patient/Doctor and remain a `WALK_IN` QueueEntry in `IN_SERVICE`.

### `POST /api/doctor/encounters/:encounterId/lab-orders`

- Requires `clinical.order.create`.

Strict JSON body:

```json
{
  "labTestIds": ["active-lab-test-id"],
  "priority": "ROUTINE",
  "clinicalNotes": "Optional bounded clinical reason"
}
```

- Requires `clinical.order.create`, same-origin JSON mutation checks, and no query parameters.
- Accepts 1–20 unique active `LabTest` IDs only. It does not accept manual test names, prices, currency, patient/Doctor IDs, author, order reference, status, or timestamps.
- Creates an immediately `ORDERED` `LabOrder`; child `LabOrderItem` rows start as `PENDING`.
- Item price and currency are taken from the active catalog and copied to `priceSnapshot`/`currencyCode` at order creation.
- Priority is limited to `ROUTINE` or `URGENT`. Clinical notes are optional and limited to 1,000 characters.
- Uses a Serializable transaction and locks the Encounter before writing the header, items, and audit event.
- Server generates the lab order reference. An audit event records actor, Encounter/order references, item count, and priority only; test names and clinical notes are excluded.

## Data and security boundaries

- Reuses the Phase 2C `LabTest`, `LabOrder`, and `LabOrderItem` models. No Prisma schema update, migration, seed, or generated client update is required.
- No role or identity is accepted from the request body. The Doctor's active Employee and DoctorProfile are resolved server-side and rechecked inside the transaction.
- The Encounter must be owned by the current Doctor and remain open. Other Doctors' Encounters are concealed as not found.
- Inactive or unknown catalog IDs fail closed; duplicate test IDs in one request are rejected.
- Multiple separate LabOrders are allowed for one Encounter. This increment does not persist an idempotency token, so the client should prevent accidental repeated submission.

## Not included

- Draft lab orders, order editing, cancellation, or re-issuing.
- Manual/free-text tests or LabTest catalog administration.
- Sample collection, sample receiving, processing, results, review, approval, release, critical-result communication, or patient result access.
- External laboratory referrals, billing, radiology, Doctor UI, or Nurse workflows.

This remains a synthetic-data portfolio/demo project, not production clinical software.
