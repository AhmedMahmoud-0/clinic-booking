# Update 65 — File-by-file guide

## New files

| File | Purpose |
| --- | --- |
| `src/app/api/doctor/encounters/[encounterId]/clinical-note/amendments/route.ts` | Protected GET/POST endpoints for reading signed-note amendment history and appending a correction. |
| `src/server/appointments/doctor-clinical-note-amendment.ts` | Loads the signed note, validates the correction chain, locks the Encounter/note, appends a ClinicalAmendment snapshot, and writes the audit event atomically. |
| `src/server/appointments/doctor-clinical-note-amendment-policy.ts` | Pure policy for Doctor identity, Encounter lifecycle/ownership, signed-note state, and original authorship. |
| `src/server/appointments/doctor-clinical-note-amendment-validation.ts` | Strict schema for a bounded reason and partial field corrections; rejects client-supplied snapshots/identity/history. |
| `tests/unit/doctor-clinical-note-amendment-policy.test.ts` | 19 policy tests. |
| `tests/unit/doctor-clinical-note-amendment-validation.test.ts` | 8 strict request-validation tests. |
| `tests/e2e/doctor-clinical-note-amendments.spec.ts` | 4 authentication and request-boundary E2E tests. |
| `docs/clinical/phase-7l-doctor-clinical-note-amendments.md` | Snapshot format, authorization, append-only chain, transaction rules, and exclusions. |
| `APPLY_UPDATE_65.md` | Apply/replace instructions and the five local verification commands. |
| `UPDATE_65_SUMMARY.txt` | Compact increment summary. |

## Existing files replaced

| File | Change |
| --- | --- |
| `README.md` | Records Update 64's successful verification and marks Phase 7L / Update 65 as the current increment. |
| `docs/implementation-roadmap.md` | Closes Phase 7K, adds Phase 7L, updates the verified baseline, and records the next remaining Phase 7 work. |

## Existing behavior preserved

- The original signed `ClinicalNote` remains unchanged; corrections are append-only `ClinicalAmendment` records.
- The implementation reuses the existing `ClinicalAmendment` model and existing `clinical.assigned.read` / `clinical.encounter.manage` permissions.
- No `schema.prisma`, migration, seed, generated Prisma client, dependency, package, environment, or UI change is included.
- Existing `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, package files, Prisma configuration, migration history, and local PostgreSQL data must remain unchanged.
