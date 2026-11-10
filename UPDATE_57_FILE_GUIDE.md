# MERUNO Update 57 — File-by-file guide

## New files

| File | Purpose |
| --- | --- |
| `src/app/api/doctor/diagnosis-catalog/route.ts` | Protected search over active DiagnosisCatalog entries; optional single `q` term; maximum 30 DTOs. |
| `src/app/api/doctor/encounters/[encounterId]/diagnoses/route.ts` | Protected GET for Encounter diagnoses and POST to attach one active catalogue diagnosis. |
| `src/app/api/doctor/encounters/[encounterId]/diagnoses/[encounterDiagnosisId]/primary/route.ts` | Protected POST to promote an existing diagnosis while preserving all diagnosis rows. |
| `src/server/appointments/doctor-diagnosis.ts` | Doctor identity/assignment rechecks, encounter-origin checks, Serializable transactions, Encounter row locking, catalogue lookup, diagnosis creation, primary changes, DTO mapping, and PII-minimal audit events. |
| `src/server/appointments/doctor-diagnosis-policy.ts` | Pure Doctor/Encounter/catalogue/add/primary policy. |
| `src/server/appointments/doctor-diagnosis-validation.ts` | Strict Zod schemas for catalogue query, Encounter IDs, diagnosis-add body, and empty primary-change body. |
| `tests/unit/doctor-diagnosis-policy.test.ts` | 20 unit tests covering active Doctor access, ownership, Encounter status/origin, catalogue activation, duplicate handling, primary selection, and primary change. |
| `tests/unit/doctor-diagnosis-validation.test.ts` | 9 unit tests covering query/body bounds, trimming, optional notes, primary flag, empty action body, and rejection of caller-controlled identity/diagnosis text. |
| `tests/e2e/doctor-diagnoses.spec.ts` | Four E2E authorization-boundary tests for catalogue read, Encounter diagnosis read, diagnosis create, and primary-change operations. |
| `docs/clinical/phase-7d-doctor-encounter-diagnoses.md` | Workflow scope, API contract, reference-data limitations, state/security rules, audit, and exclusions. |

## Modified files

| File | What changed |
| --- | --- |
| `README.md` | Marks Phase 7C / Update 56 as complete based on the developer-confirmed 640 unit and 92 E2E tests; records Update 57 as the current increment. |
| `docs/implementation-roadmap.md` | Records Update 56 verification and adds the Phase 7D diagnosis workflow and constraints. |

## Data mapping and behavior

- Search reads active `DiagnosisCatalog` rows only.
- Add creates `EncounterDiagnosis` with a `displayNameSnapshot`, notes, primary state, authenticated employee author, and database timestamp.
- The first diagnosis is primary by default. A later diagnosis becomes primary only when requested.
- Switching primary updates flags only. It does not delete, rewrite, or re-author existing diagnosis rows.
- Existing database partial unique index `EncounterDiagnosis_one_primary_per_encounter_uq` enforces at most one primary diagnosis per Encounter.
- The current seeded catalogue contains six `MERUNO-DEMO` entries. These are synthetic labels, not an authoritative diagnosis code system. No additional code labels are invented here.

## Intentionally unchanged

- `prisma/schema.prisma`, migration history, seeds, generated Prisma Client.
- Package files, dependencies, scripts, environment variables.
- Existing role and permission definitions; reuses `CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE`.
- ClinicalNote draft/signature, Encounter start/completion, queue APIs, prescriptions, vitals, lab/radiology orders, referrals, follow-up, UI, and Nurse workflows.

## Expected verification additions

- 29 unit tests: 20 diagnosis policy + 9 request-validation.
- 4 E2E authorization-boundary tests.
- Baseline after Update 56: 640 unit tests and 92 E2E tests.
- Expected totals, assuming no unrelated local test changes: **669 unit tests** and **96 E2E tests**.

These E2E tests validate unauthenticated route boundaries. They do not replace an authenticated local DB-backed test using active Doctor, Encounter, and seeded DiagnosisCatalog rows, including primary-diagnosis switching and concurrent requests.
