# Update 60 — File-by-file guide

## New server modules

| File | Purpose | Main exports / behavior |
| --- | --- | --- |
| `src/server/appointments/doctor-radiology-order.ts` | Doctor-only procedure catalogue search, Encounter radiology-order history, and atomic creation of immediate `ORDERED` requests. | `searchDoctorRadiologyCatalog()`, `getDoctorEncounterRadiologyOrders()`, `createDoctorRadiologyOrder()`, `DoctorRadiologyOrderError`. |
| `src/server/appointments/doctor-radiology-order-policy.ts` | Pure checks for active Doctor/Encounter ownership, editable state, visit source, distinct active procedure IDs, X-ray screening-decision presence, and documented not-indicated reasons. | `decideDoctorRadiologyEncounterAccess()`, `decideDoctorRadiologyProcedureSelection()`, `decideDoctorRadiologyPregnancyAssessment()`. |
| `src/server/appointments/doctor-radiology-order-validation.ts` | Strict Zod schemas for Encounter ID, catalogue query, 1–10 unique procedure IDs, priority, bounded notes, and X-ray order-time screening decision. | `doctorRadiologyEncounterIdSchema`, `doctorRadiologyCatalogQuerySchema`, `doctorRadiologyOrderRequestSchema`. |

## New Route Handlers

| File | Methods | Purpose |
| --- | --- | --- |
| `src/app/api/doctor/radiology-catalog/route.ts` | `GET` | Search active digital X-ray/ultrasound procedure catalogue entries. |
| `src/app/api/doctor/encounters/[encounterId]/radiology-orders/route.ts` | `GET`, `POST` | Read the authenticated Doctor's Encounter radiology orders and create a new order. |

## Schema and migration

| File | Change |
| --- | --- |
| `prisma/schema.prisma` | Adds a distinct order-time decision (`SCREENING_REQUIRED` / `NOT_INDICATED`), bounded rationale, recording employee, and timestamp to `RadiologyOrderItem`, plus the Employee back-relation. It remains separate from the formal exam-day screening result enum. |
| `prisma/migrations/20261109223000_radiology_order_pregnancy_assessment/migration.sql` | Migration 12 creates the distinct order-time decision enum, adds four fields, and installs consistency CHECK/FK constraints, an index, and a modality-aware trigger that ensures the decision actor is the ordering Doctor. Historical rows are not backfilled or rewritten. |

## Tests

| File | Coverage |
| --- | --- |
| `tests/unit/doctor-radiology-order-policy.test.ts` | 23 tests for role, DoctorProfile, Encounter ownership/state/origin, procedure selection, X-ray assessment requirement, and not-applicable reasons. |
| `tests/unit/doctor-radiology-order-validation.test.ts` | 17 tests for identifiers, catalog query, procedure count/uniqueness, priority, clinical notes, accepted decision values, and forged fields. |
| `tests/unit/doctor-radiology-pregnancy-migration.test.ts` | 9 tests for the distinct decision enum, field consistency, Employee attribution, modality trigger, and non-destructive behavior. |
| `tests/e2e/doctor-radiology-orders.spec.ts` | 4 unauthenticated authorization-boundary tests for catalogue, order read, create, and forged fields. |

## Documentation

- `docs/clinical/phase-7g-doctor-radiology-orders.md` documents the endpoint contracts, order-time X-ray screening decision, migration, and exclusions.
- `docs/implementation-roadmap.md` closes Phase 7F and records Phase 7G as the current increment.
- `README.md` updates the current implementation status and migration state.

## Existing files to replace

- `prisma/schema.prisma`
- `README.md`
- `docs/implementation-roadmap.md`

## Database and dependencies

- Reuses `RadiologyProcedure`, `RadiologyResource`, `RadiologyOrder`, `RadiologyOrderItem`, `RadiologyExam`, `RadiologyPregnancyScreening`, `Employee`, `Encounter`, and `AuditLog`.
- Adds Migration 12; there is no seed change or new package dependency.
- Prisma validation and client generation are required because the schema changed. Migration deployment is required after confirming migration 11 is applied.
