# Update 58 — File-by-file guide

## New files

| File | Purpose |
| --- | --- |
| `src/app/api/doctor/encounters/[encounterId]/prescriptions/route.ts` | Protected GET prescription history and POST initial DRAFT creation for the authenticated Doctor's active Encounter. |
| `src/app/api/doctor/encounters/[encounterId]/prescriptions/[prescriptionId]/route.ts` | Protected PUT that replaces all medication items/instructions of the original prescriber's DRAFT only. |
| `src/server/appointments/doctor-prescription.ts` | Doctor/Encounter rechecks, visit-origin validation, DTO mapping, Serializable transactions, Encounter/Prescription locks, draft persistence, PRN field mapping, and PII-minimal audit events. |
| `src/server/appointments/doctor-prescription-policy.ts` | Pure policy for active Doctor access, Encounter ownership/state/source, one-draft creation, draft immutability, and original-author ownership. |
| `src/server/appointments/doctor-prescription-validation.ts` | Strict Zod validation for IDs and 1–20 prescription items, manual medication/direction strings, decimal quantities, refills, and mandatory PRN maximum fields. |
| `prisma/migrations/20261109110000_prescription_prn_safety_fields/migration.sql` | Migration 11 adds the structured PRN maximum-dose fields and PostgreSQL consistency check. |
| `tests/unit/doctor-prescription-policy.test.ts` | 19 unit tests for Doctor/Encounter access, draft creation, prescription states, and author ownership. |
| `tests/unit/doctor-prescription-validation.test.ts` | 21 unit tests for required/optional fields, limits, decimal amounts, quantity units, PRN completeness, and rejection of caller-controlled fields. |
| `tests/unit/prescription-prn-migration.test.ts` | Eight tests for migration 11's non-destructive PRN schema and one-draft-per-Encounter contracts. |
| `tests/e2e/doctor-prescriptions.spec.ts` | Five E2E tests for authentication boundaries on reads, creates, forged fields, and updates. |
| `docs/clinical/phase-7e-doctor-prescriptions.md` | API, data, transaction, PRN, audit, and scope boundaries. |

## Replaced files

| File | What changed |
| --- | --- |
| `prisma/schema.prisma` | Adds `isPrn`, `prnMaxQuantityPerDose`, `prnMaxDoseUnit`, and `prnMaxDosesPerDay` to `PrescriptionItem`, matching migration 11. |
| `docs/implementation-roadmap.md` | Records Update 57 + Fix 01 as complete and Update 58 / Phase 7E as the current increment. |
| `README.md` | Aligns the locally verified Phase 7D status and records pending Phase 7E. |

## Transaction and data rules

- Read only the active Doctor's own Encounter. Encounter ownership and visit origin are rechecked in the service, not inferred from the client.
- Only one `DRAFT` is created per Encounter. A PostgreSQL partial unique index enforces this; migration 11 fails safely if legacy duplicate drafts exist. A later create request returns a conflict so the client reads and edits the existing draft instead.
- Only the original employee prescriber may update a draft. The Encounter must still be `IN_PROGRESS`, and the Prescription must remain `DRAFT` with `issuedAt = null`.
- `ISSUED` and `CANCELLED` rows are readable but are not mutable through this API.
- A draft update replaces all its `PrescriptionItem` rows atomically. An identical payload is a no-op and does not add an audit event.
- PRN items require a positive maximum amount, its unit, and a positive integer maximum number of doses per day. Non-PRN items must keep those fields null. The database CHECK is the final integrity boundary.
- Medication and dose text are manual demo inputs, not a normalized drug catalogue or clinical decision-support system.
- Audit events contain employee identity, operation, Prescription/Encounter IDs, item count, and timestamp only. They do not contain clinical text or patient data.

## Local verification additions

- Unit tests: 46 total new tests (19 policy, 21 validation, 8 migration contract).
- E2E tests: 5 new unauthenticated authorization-boundary tests.
- Baseline after Update 57 Fix 01: 669 unit and 96 E2E.
- Expected totals: **717 unit** and **101 E2E**, assuming no unrelated local test changes.

The E2E tests validate unauthenticated boundaries. The developer should also verify migration status, PRN checks, and the authenticated local DB-backed flows with synthetic Encounter/Doctor data. This update does not add a test fixture that inserts clinical prescription records into the developer's local database.
