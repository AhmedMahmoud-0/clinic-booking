# MERUNO Update 55 — File-by-file guide

## New files

| File | Purpose |
| --- | --- |
| `src/app/api/doctor/queue/[queueEntryId]/start/route.ts` | Protected `POST /api/doctor/queue/:queueEntryId/start`; requires `clinical.encounter.manage`, same-origin, no query parameters, and an empty JSON object. |
| `src/server/appointments/doctor-encounter-start.ts` | Rechecks the active Doctor actor, locks DoctorProfile/QueueEntry/Appointment, creates the visit Encounter, transitions the queue and appointment, appends appointment history, and writes the audit event in one Serializable transaction. |
| `src/server/appointments/doctor-encounter-start-policy.ts` | Pure decision policy for Doctor role, current-day queue ownership, source consistency, ticket/appointment state, idempotency, and one active consultation per Doctor. |
| `src/server/appointments/doctor-encounter-start-validation.ts` | Validates the path ID and enforces an empty strict JSON request body. |
| `tests/unit/doctor-encounter-start-policy.test.ts` | 17 unit tests for appointment/walk-in start eligibility and fail-closed state handling. |
| `tests/e2e/doctor-encounter-start.spec.ts` | Three Route Handler authentication-boundary tests; authenticated business-transition validation is not exercised by these unauthenticated E2E cases. |
| `docs/clinical/phase-7b-doctor-encounter-start.md` | Scope, state transitions, locking, visit-origin rules, API response, and non-goals. |

## Modified files

| File | What changed |
| --- | --- |
| `src/server/appointments/doctor-worklist.ts` | Resolves the worklist Encounter from `Appointment.encounter` for appointment visits and `QueueEntry.encounter` for walk-ins, matching the Phase 2B one-origin contract. |
| `src/server/appointments/doctor-worklist-policy.ts` | Adds a pure source-aware Encounter resolver for the Doctor worklist. |
| `tests/unit/doctor-worklist-policy.test.ts` | Adds three tests for appointment, walk-in, and unsupported source Encounter projection. |
| `README.md` | Closes Phase 7A using the developer-confirmed Update 54 test results and marks Update 55 / Phase 7B as the current unverified increment. |
| `docs/implementation-roadmap.md` | Records Update 54 verification, moves Phase 7B to current, and documents the atomic start-consultation transition and origin-specific Encounter link. |

## Intentionally unchanged

- `prisma/schema.prisma`, all migrations, and all seed files.
- `package.json`, lockfile, Node dependencies, package scripts, and environment files.
- Existing authorization definitions; reuses `CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE`.
- Reception Call Next, check-in, walk-in registration, cancellation, and no-show behavior.
- Clinical notes, diagnoses, vitals, prescriptions, lab/radiology orders, referrals, follow-up, completion, and approval workflows.

## Expected verification additions

- Unit: 17 tests in `doctor-encounter-start-policy.test.ts` plus 3 tests for source-specific Encounter projection in `doctor-worklist-policy.test.ts`.
- E2E: 3 tests in `doctor-encounter-start.spec.ts`.
- Baseline after Update 54 was 593 unit tests and 86 E2E tests. Assuming the local suite has not changed, expected totals are **613 unit tests** and **89 E2E tests**.

The E2E cases establish the unauthenticated Route Handler boundary; they do not replace local authenticated Doctor/Appointment/Walk-in transaction tests.
