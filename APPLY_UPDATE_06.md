# MERUNO Update 06 — Phase 2A

## Included files

1. `prisma/schema.prisma` — replaces the existing Prisma schema with the Phase 2A domain models.
2. `docs/database/phase-2a-master-data-patients.md` — new documentation for the models, relationships, constraints, and Phase 2A boundaries.

## What this update adds

- Specialties and employee records.
- Doctor profiles and doctor-specialty assignments.
- Service catalog and doctor-specific service pricing/duration.
- Weekly doctor schedules and schedule exceptions.
- Patient records, contact methods, and family/guardian relationships.

This update does not add appointments, authentication, clinical records, laboratory/radiology, billing, seed data, or migrations. It does not connect to or modify PostgreSQL.

## Apply on Windows

1. Close any process that may be using the project files (optional; no running database action is required).
2. Extract this ZIP into the project root: `C:\Users\PC\clinic-booking\clinic-booking`.
3. Allow the two included project paths to merge. Replace only `prisma/schema.prisma` when Windows asks.
4. Keep all other project files as they are.

Do not replace `.env`, `.git`, `.gitignore`, `package.json`, `package-lock.json`, `node_modules`, `.next`, or `generated/prisma`.

## Verify — run one command at a time

From the project root:

```powershell
npm run db:validate
```

Send the complete output before proceeding. If it succeeds, the next command will be:

```powershell
npm run db:generate
```

The generate command updates the ignored `generated/prisma/` client files locally; do not include that generated folder in a ZIP or commit it.

## Important safety boundary

Do not run `prisma migrate dev`, `prisma db push`, `prisma migrate reset`, or database reset commands for Update 06. This is a schema-only increment. Migrations, PostgreSQL constraints, and synthetic seed data will be prepared in later, separately reviewed steps.
