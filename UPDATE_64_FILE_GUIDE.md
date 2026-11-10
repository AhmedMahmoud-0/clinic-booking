# Update 64 — File-by-file guide

## New files

| File | Purpose |
| --- | --- |
| `src/app/api/doctor/encounters/[encounterId]/clinical-note/sign/route.ts` | Protected `POST` route for signing an initial assessment draft; requires same-origin, strict empty JSON, no query parameters, and `clinical.encounter.manage`. |
| `src/server/appointments/doctor-clinical-note-sign.ts` | Server transaction: active Doctor and Encounter ownership checks, visit-origin checks, Encounter/note locks, conditional signature update, server timestamp, and atomic audit. |
| `src/server/appointments/doctor-clinical-note-sign-policy.ts` | Pure signing eligibility policy: active Doctor, owned in-progress Encounter, consistent origin, exactly one authored draft, consistent signature fields, and minimal structural content. |
| `src/server/appointments/doctor-clinical-note-sign-validation.ts` | Strict empty-object request schema and reuse of the existing Encounter ID schema. |
| `tests/unit/doctor-clinical-note-sign-policy.test.ts` | 15 policy tests plus six strict-request validation tests. |
| `tests/e2e/doctor-clinical-note-sign.spec.ts` | Four E2E tests for authentication, forged signature fields, forged Encounter path, and query handling. |
| `docs/clinical/phase-7k-doctor-clinical-note-signing.md` | Scope, eligibility, transaction, audit, and exclusions. |
| `APPLY_UPDATE_64.md` | Exact merge/replace and local validation steps. |
| `UPDATE_64_FILE_GUIDE.md` | This file. |
| `UPDATE_64_SUMMARY.txt` | Compact summary of the increment. |

## Existing files replaced

| File | Change |
| --- | --- |
| `README.md` | Closes Update 63 with the developer's verified totals and records Update 64 as the current increment. |
| `docs/implementation-roadmap.md` | Updates Phase 7J to complete, adds Phase 7K, and records signing behavior and future work. |

## Existing behavior preserved

- The current draft-save route remains unchanged and continues to reject edits after signing.
- The signer must be the original note author and the Doctor assigned to the Encounter.
- `Encounter` stays `IN_PROGRESS`; this endpoint does not complete the visit.
- No schema, migration, seed, permission matrix, dependency, environment, or package file is changed.
