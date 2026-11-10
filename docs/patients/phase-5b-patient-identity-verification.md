# MERUNO Phase 5B — Patient Identity Verification

## Purpose

Verify an existing active patient record using two distinct identity elements before a staff workflow proceeds. This increment adds a reusable server-side API and audit trail; it does not add patient, appointment, encounter, or workspace screens.

## Authorization

`patient.identity.verify` is a separate operation permission. It is granted to Reception, Doctor, Nurse, Lab Staff, Radiology Staff, Radiologist, and Cashier because these roles may directly identify a patient during an in-clinic workflow. It is not granted to Clinic Manager or System Admin. Every request also requires an authenticated, active, verified employee account through the existing route guard.

## API

`POST /api/clinic/patients/{patientId}/identity-verifications`

Example request:

```json
{
  "firstIdentifier": { "type": "FULL_NAME", "value": "Mariam Ali Hassan" },
  "secondIdentifier": { "type": "DATE_OF_BIRTH", "value": "1995-04-12" }
}
```

Supported identifiers are exactly the fields represented on the current `Patient` model:

- `FULL_NAME`
- `DATE_OF_BIRTH`
- `PHONE`
- `MRN`

National ID, passport, email, and `OTHER` are not accepted as comparison identifiers because the current Patient model does not store them as identity fields. No raw document value is added to this flow.

Both identifiers must be different types and both must match the same active patient. The server returns HTTP 200 with `VERIFIED` on success, or HTTP 409 with a generic mismatch result on failure. It does not disclose which identifier failed.

## Privacy and audit

- The submitted identity values are used only in memory for comparison.
- `IdentityVerification` stores the two element types, result, employee, and timestamp; its notes are fixed text and contain no submitted values.
- Both successful and failed attempts are retained in `IdentityVerification` and receive a minimal AuditLog event.
- Audit event reasons are fixed descriptions. Names, phone numbers, MRNs, dates of birth, and other submitted values are never copied into audit data.
- The service returns only the verification ID, patient ID, result, element types, and timestamp.
- Responses are `no-store` and same-origin mutation checks use the existing patient-management HTTP helper.

## Existing models reused

- `Patient`
- `PatientContact`
- `IdentityVerification`
- `AuditLog`
- `Employee` (as verifier)

No Prisma schema changes, migration, seed, Prisma Client generation, dependency, or environment variable is introduced.

## Deferred

Appointment-linked verification and check-in state are part of Phase 6. Sample identity checks within the laboratory workflow and imaging identity/preparation are consumed by Phase 8. Staff-facing screens remain scheduled for Phase 11. Patient-facing identity and consent screens are not part of this update.
