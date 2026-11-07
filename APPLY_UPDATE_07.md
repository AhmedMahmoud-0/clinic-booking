# MERUNO Update 07 — Phase 2A Hardening

## Included files

1. `prisma/schema.prisma` — adds patient gender and separates a family relationship from a staff-verified legal-guardian designation.
2. `docs/database/phase-2a-master-data-patients.md` — replaces the Phase 2A model documentation with the clarified rules and planned SQL constraints.
3. `docs/database/phase-2a-constraints.md` — new register of PostgreSQL-only constraints and application invariants for the first migration.
4. `README.md` — corrects the current implementation status and Prisma schema description.
5. `docs/implementation-roadmap.md` — updates Phase 1 completion and decomposes Phase 2 into 2A–2E.
6. `docs/architecture.md` — corrects outdated implementation and testing claims.

## What changed in the schema

- Adds `PatientGender` and the nullable `Patient.gender` field. `NULL` means no value recorded; `NOT_SPECIFIED` is an explicit recorded choice.
- Removes `GUARDIAN` from `PatientRelationshipType`. Relationship type now represents family relationship only.
- Renames `PatientRelationship.type` to `relationshipType` for clarity.
- Replaces `isGuardian` with `isLegalGuardian`.
- Adds `guardianVerifiedAt` and `guardianVerifiedByEmployeeId`, linked to the employee who recorded legal-guardian verification.
- Adds the inverse `Employee.verifiedGuardianRelationships` relation.
- Documents required PostgreSQL CHECK constraints and two partial unique indexes to be included in the future first migration.

There are still 11 domain models. This update does not add login accounts, patient access grants, appointments, encounters, migrations, or seed data.

## Apply on Windows

1. Extract this ZIP into the project root: `C:\Users\PC\clinic-booking\clinic-booking`.
2. Merge the included folders.
3. Replace the listed files when prompted. Do not replace any other project files.
4. Keep `.env`, `.git`, `.gitignore`, `package.json`, `package-lock.json`, `node_modules`, `.next`, and all existing generated/runtime data untouched.

## Verify — one command at a time

From the project root, run:

```powershell
npm run db:validate
```

If it succeeds, run:

```powershell
npm run db:generate
```

Then run:

```powershell
npm run typecheck
```

Send the complete output. Do not continue to the next command if the current one fails.

## Database safety

Update 07 is schema and documentation only. It does not connect to PostgreSQL, create tables, insert seed data, or apply constraints. Do not run `prisma migrate dev`, `prisma db push`, `prisma migrate reset`, or any database reset command as part of this update.

The SQL in `docs/database/phase-2a-master-data-patients.md` is a design register for the future reviewed migration; it is not an executable migration file.
