# Update 63 — File-by-file guide

## New server files

| File | Purpose |
| --- | --- |
| `src/server/appointments/doctor-prescription-issue-validation.ts` | Strict empty-object schema. The client cannot choose status, issuer, issue time, or other fields. |
| `src/app/api/doctor/encounters/[encounterId]/prescriptions/[prescriptionId]/issue/route.ts` | Authenticated, same-origin `POST` route for issuing a prescription. |
| `tests/unit/doctor-prescription-issue-policy.test.ts` | 11 policy tests for author, draft state, issue timestamp, and item-count boundaries. |
| `tests/e2e/doctor-prescription-issue.spec.ts` | Four E2E authentication and forged-field boundary tests. |
| `docs/clinical/phase-7j-doctor-prescription-issuance.md` | API contract, transaction invariants, and explicit workflow exclusions. |

## Existing files replaced

| File | Change |
| --- | --- |
| `src/server/appointments/doctor-prescription-policy.ts` | Adds the pure policy for issuing only an existing, authored, valid DRAFT. |
| `src/server/appointments/doctor-prescription.ts` | Adds row-locked Serializable issuance and atomic minimal audit logging; existing draft creation/read/update logic is retained. |
| `README.md` | Records Update 62 completion and Update 63 current status. |
| `docs/implementation-roadmap.md` | Closes Phase 7I and documents Phase 7J. |

## Intentionally unchanged

- `prisma/schema.prisma` and all migration folders.
- `package.json`, `package-lock.json`, environment files, Prisma config, auth and permission matrix.
- Generated Prisma Client, UI components, translation files, seed data, and unrelated server modules.

There is no migration or Prisma Client regeneration step in Update 63.
