# Apply MERUNO Update 57 — Phase 7D Doctor Encounter Diagnoses

## Before applying

1. Confirm Update 56 is applied and all five local checks passed: typecheck, lint, 640 unit tests, 92 E2E tests, and production build.
2. Back up the complete `clinic-booking` project folder or commit the current working tree.
3. Close running Next.js/Playwright processes that may hold files under `.next`.

## Apply files

1. Extract this ZIP directly into the existing `clinic-booking` project root.
2. Merge all new files into their matching folders.
3. Replace only these existing files when prompted:
   - `README.md`
   - `docs/implementation-roadmap.md`
4. Do not replace or delete any other project files. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, and the local PostgreSQL database.

See `UPDATE_57_FILE_GUIDE.md` for the complete file-by-file list.

## Database and dependencies

This update reuses the existing `Employee`, `DoctorProfile`, `Encounter`, `Appointment`, `QueueEntry`, `DiagnosisCatalog`, `EncounterDiagnosis`, and `AuditLog` models, plus the existing `clinical.encounter.manage` permission. It also reuses the reviewed PostgreSQL partial unique index `EncounterDiagnosis_one_primary_per_encounter_uq`.

There is no schema change, migration, seed, Prisma Client generation, dependency, package script, or environment-variable change. Do not run `db push`, `migrate dev`, `migrate deploy`, database reset, seed, or migration repair for this update.

## Important catalogue limitation

The existing seed contains six synthetic `MERUNO-DEMO` diagnosis labels. They are portfolio placeholders, not ICD-10, SNOMED CT, or an authoritative clinical coding catalogue. This update only searches and attaches those existing active labels; it does not invent diagnoses or code-system identifiers. All data must remain synthetic.

## Behavior and safety boundary

- All routes require `clinical.encounter.manage` and recheck active Doctor status, active DOCTOR role assignment, and linked DoctorProfile in the service.
- An Encounter must belong to the current Doctor, remain `IN_PROGRESS`, have no completion timestamp, and retain a consistent appointment or walk-in origin.
- All diagnosis mutations lock the Encounter row and run in a Serializable transaction.
- Only active DiagnosisCatalog entries can be attached. Duplicate diagnosis IDs on one Encounter are rejected.
- The first attached diagnosis becomes primary automatically. A later diagnosis is secondary unless the Doctor explicitly marks it primary.
- Promoting a diagnosis demotes the prior primary in the same transaction. The database partial unique index remains the final guard against multiple primary rows.
- Diagnosis rows are never deleted or rewritten by this update. Switching primary status preserves each diagnosis row's original author and recorded time. A distinct diagnosis correction/history workflow remains future work.
- Audit rows contain identifiers and actor/time metadata only; diagnosis notes and clinical narrative are not copied into audit text.

## Local verification

Run in order from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The update adds 29 unit tests and 4 E2E authorization-boundary tests. Assuming no unrelated local test changes after Update 56, expected totals are **669 unit tests** and **96 E2E tests**. The local test output is authoritative.

The E2E tests verify unauthenticated route boundaries. They do not replace an authenticated database-backed test with an active Doctor, in-progress Encounter, and active seeded diagnosis rows. If any command fails, stop and share the complete output before making manual edits.
