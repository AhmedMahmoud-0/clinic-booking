# Apply MERUNO Update 70

Update 70 completes Phase 8I–8J. Apply it on top of the verified Update 69 + Fix 01–03 project.

## 1. Back up the current project

Create a separate copy of the project folder and database backup before applying the update. Keep the current migration history intact.

## 2. Copy the update files

Extract the ZIP and merge its contents into the project root. Overwrite only the matching paths listed in `UPDATE_70_FILE_GUIDE.md`. Do not replace the complete project directory.

## 3. Validate and generate Prisma Client

From the project root:

```bash
npm run db:validate
npm run db:generate
```

Resolve any schema or generation error before moving to the migration step.

## 4. Check and apply Migration 16

```bash
npx prisma migrate status --config=./prisma7.config.ts
```

If and only if Migration 16 is pending, apply the existing migration:

```bash
npx prisma migrate deploy --config=./prisma7.config.ts
```

Then verify:

```bash
npx prisma migrate status --config=./prisma7.config.ts
```

Expected migration folder:

`20261111020000_radiology_execution_reporting_and_external_results`

The migration is incremental. Do not run `db push`, `migrate reset`, `migrate dev`, `TRUNCATE`, or manual edits to `_prisma_migrations`.

## 5. Run all project checks

```bash
npm run typecheck
npm run lint
npm test
npx playwright test --workers=1
npm run build
```

Do not proceed to Phase 9 until all checks pass and Migration 16 is up to date. Send the full output of the first failing command if any check fails; do not patch generated Prisma Client files manually.

## 6. Expected workflow boundaries

- Only the assigned Radiology Staff role can start/complete exams and receive outside results.
- Only a Radiologist can author, submit, review, approve, release, or record the criticality of an internal report. Radiology Staff cannot approve reports.
- Radiology Staff and Radiologists receive a separate critical-communication capability; Doctors can only acknowledge communications tied to their assigned Encounters. The original author cannot approve their own report.
- Readiness is checked again in the transaction that starts the exam.
- A critical report cannot be released before the ordering Doctor confirms read-back for every recorded critical communication.
- An external report must be attached to an active Encounter of the requesting Doctor and matching granted external diagnostic data-sharing consent.
- The Doctor can retrieve reports only when assigned to the originating Encounter.
- External result receipt is structured text only. No PACS, DICOM, file upload, or patient-portal release is included.
