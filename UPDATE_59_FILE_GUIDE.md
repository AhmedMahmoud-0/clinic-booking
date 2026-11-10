# Update 59 — File-by-file guide

## New server files

| File | Purpose |
| --- | --- |
| `src/server/appointments/doctor-lab-order.ts` | Doctor-only catalog search, Encounter order history, and atomic creation of immediate `ORDERED` laboratory requests using active catalog prices. |
| `src/server/appointments/doctor-lab-order-policy.ts` | Pure checks for active Doctor/Encounter ownership, open Encounter state, consistent appointment/walk-in origin, and distinct active test selection. |
| `src/server/appointments/doctor-lab-order-validation.ts` | Strict Zod schemas for Encounter IDs, catalog query, 1–20 distinct test IDs, priority, and bounded clinical notes. |

## New Route Handlers

| File | Methods | Purpose |
| --- | --- | --- |
| `src/app/api/doctor/lab-catalog/route.ts` | `GET` | Search active clinic laboratory tests. |
| `src/app/api/doctor/encounters/[encounterId]/lab-orders/route.ts` | `GET`, `POST` | Read the authenticated Doctor's Encounter orders and create a new immediate lab order. |

## New tests

| File | Coverage |
| --- | --- |
| `tests/unit/doctor-lab-order-policy.test.ts` | 17 tests for role, profile, Encounter ownership/state/origin, and active/distinct test selection. |
| `tests/unit/doctor-lab-order-validation.test.ts` | 17 tests for identifiers, catalog query, test selection count/uniqueness, priority, clinical-note bounds, and rejecting caller-controlled fields. |
| `tests/e2e/doctor-lab-orders.spec.ts` | 4 unauthenticated authorization-boundary tests for catalog, read, create, and forged fields. |

## Documentation

- `docs/clinical/phase-7f-doctor-lab-orders.md` describes the API contracts, workflow, and exclusions.
- `docs/implementation-roadmap.md` updates Phase 7E closure and records Phase 7F.
- `README.md` updates the verified project status and current increment.

## Existing files to replace

- `README.md`
- `docs/implementation-roadmap.md`

No existing application source file is replaced.

## Database and dependencies

- Reuses existing `LabTest`, `LabOrder`, and `LabOrderItem` models.
- No `prisma/schema.prisma` modification, migration, seed, `db:generate`, or `npm install` is required.
- No dependency, package script, or environment variable changes.
