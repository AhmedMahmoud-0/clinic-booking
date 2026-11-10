# Apply MERUNO Update 56 — Phase 7C Doctor Clinical-Note Draft

## Before applying

1. Confirm Update 55 is applied and all five local checks passed: typecheck, lint, 613 unit tests, 89 E2E tests, and production build.
2. Back up the complete `clinic-booking` project folder or commit the current working tree.
3. Close running Next.js/Playwright processes that may hold files under `.next`.

## Apply files

1. Extract this ZIP directly into the existing `clinic-booking` project root.
2. Merge the new files into their matching folders.
3. Replace only these existing files when prompted:
   - `README.md`
   - `docs/implementation-roadmap.md`
4. Do not replace or delete any other project files. Preserve `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, and the local PostgreSQL database.

See `UPDATE_56_FILE_GUIDE.md` for the complete file-by-file list.

## Database and dependencies

This update reuses the existing `Employee`, `DoctorProfile`, `Encounter`, `ClinicalNote`, `ClinicalAmendment`, `Appointment`, `QueueEntry`, and `AuditLog` models, along with `clinical.encounter.manage`.

There is no schema change, migration, seed, Prisma Client generation, dependency, package script, or environment-variable change. Do not run `db push`, `migrate dev`, `migrate deploy`, database reset, seed, or migration repair for this update.

## Behavior and safety boundary

- `PUT /api/doctor/encounters/:encounterId/clinical-note` saves the authenticated Doctor's initial assessment as a draft only.
- The strict JSON body accepts `chiefComplaint`, `historyOfPresentIllness`, `clinicalExamination`, `assessment`, and `treatmentPlan`. It rejects identity, author, diagnosis ID, status, signature, and timestamp fields.
- The authenticated employee must remain active, have an active `DOCTOR` assignment, and retain a linked DoctorProfile. The Encounter must belong to that Doctor, remain `IN_PROGRESS`, have no completion timestamp, and retain a consistent appointment or Walk-in origin.
- The Encounter row is locked before the initial assessment is read/created. Create a missing `INITIAL_ASSESSMENT` draft or update the single unsigned draft authored by the same employee. Multiple notes, foreign authors, or inconsistent note state fail closed.
- A signed ClinicalNote cannot be changed by this endpoint. Corrections must use the separate `ClinicalAmendment` workflow.
- `Encounter.chiefComplaint` stores the complaint. `ClinicalNote.subjective`, `.objective`, `.assessment`, and `.plan` store HPI, examination, narrative assessment, and treatment plan. Narrative assessment is not a coded diagnosis.
- Actual creates/updates append `DOCTOR_CLINICAL_NOTE_DRAFT_SAVED` in the same transaction. Clinical text is never copied to the audit log. An unchanged save does not create a redundant audit event.
- The endpoint does not sign the note, complete the Encounter, add diagnoses, vitals, prescriptions, lab/radiology orders, referrals, follow-up, UI, or Nurse workflows.

All records remain synthetic. MERUNO is a portfolio/demo application, not production clinical software.

## Local verification

Run in order from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The update adds 27 unit tests (16 policy + 11 request-validation) and 3 E2E authorization-boundary tests. Assuming no unrelated local test changes after Update 55, expected totals are **640 unit tests** and **92 E2E tests**. These expected counts are targets; the local test output is authoritative.

The E2E tests verify the unauthenticated route boundary. They do not replace a local authenticated database-backed test using a Doctor, an active Encounter, and both appointment and Walk-in origins. If any command fails, stop and share the complete output before making manual edits.
