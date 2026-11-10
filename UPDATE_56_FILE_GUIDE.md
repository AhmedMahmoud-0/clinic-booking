# MERUNO Update 56 — File-by-file guide

## New files

| File | Purpose |
| --- | --- |
| `src/app/api/doctor/encounters/[encounterId]/clinical-note/route.ts` | Protected `PUT /api/doctor/encounters/:encounterId/clinical-note`; requires `clinical.encounter.manage`, same-origin JSON, no query parameters, and a strict note-draft body. |
| `src/server/appointments/doctor-clinical-note.ts` | Rechecks Doctor identity/ownership, locks the Encounter, validates origin/state, creates or updates the unsigned initial note draft, updates chief complaint, and audits the save in one Serializable transaction. |
| `src/server/appointments/doctor-clinical-note-policy.ts` | Pure state/ownership policy for Doctor, Encounter, initial assessment cardinality, draft authorship, and signature immutability. |
| `src/server/appointments/doctor-clinical-note-validation.ts` | Strict Zod validation for the five allowed narrative fields and Encounter ID. |
| `tests/unit/doctor-clinical-note-policy.test.ts` | 16 unit tests for active Doctor access, Encounter ownership/state/origin, one-note cardinality, author ownership, and signed-note immutability. |
| `tests/unit/doctor-clinical-note-validation.test.ts` | 11 unit tests for required/optional text, bounds, trimming, null support, wrong types, and rejection of caller-controlled identity/status fields. |
| `tests/e2e/doctor-clinical-note-draft.spec.ts` | Three E2E tests for unauthenticated route rejection and forged clinical/identity fields. |
| `docs/clinical/phase-7c-doctor-clinical-note-draft.md` | Scope, field mapping, transaction/state rules, audit behavior, and exclusions. |

## Modified files

| File | What changed |
| --- | --- |
| `README.md` | Closes Phase 7B using developer-confirmed test results and marks Update 56 / Phase 7C as the current unverified increment. |
| `docs/implementation-roadmap.md` | Records Update 55 verification and documents Phase 7C draft-note persistence and constraints. |

## Persistence mapping

| Request field | Database field |
| --- | --- |
| `chiefComplaint` | `Encounter.chiefComplaint` |
| `historyOfPresentIllness` | `ClinicalNote.subjective` |
| `clinicalExamination` | `ClinicalNote.objective` |
| `assessment` | `ClinicalNote.assessment` |
| `treatmentPlan` | `ClinicalNote.plan` |

The assessment field is narrative SOAP text only. Coded diagnosis creation remains a separate operation.

## Intentionally unchanged

- `prisma/schema.prisma`, migrations, seeds, and generated Prisma Client.
- Package files, dependencies, scripts, and environment variables.
- Existing authorization definitions; reuses `CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE`.
- Doctor encounter start, queue worklist, Reception queue, and appointment transition APIs.
- Note signing, clinical amendments, coded diagnoses, vitals, prescriptions, diagnostics orders, referrals, follow-up, encounter completion, Doctor UI, and Nurse workflows.

## Expected verification additions

- 27 unit tests: 16 policy + 11 validation.
- 3 E2E authorization-boundary tests.
- Baseline after Update 55: 613 unit tests and 89 E2E tests.
- Expected totals, assuming no unrelated local test changes: **640 unit tests** and **92 E2E tests**.

The E2E cases validate only the unauthenticated route boundary. A local authenticated test with actual Encounter rows remains necessary to exercise the database transaction for appointment and Walk-in origins.
