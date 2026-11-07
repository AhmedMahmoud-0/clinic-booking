# Apply Update 31 — Phase 4C Master Data Administration

## Before applying

The developer confirmed Update 30's fifth migration is applied and the database is up to date. Update 31 does not change the Prisma schema and does not add a migration.

Apply this ZIP over the current project after Update 30. Add the new files and replace only the listed authorization and documentation files. Do not replace `.env`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, the generated Prisma client, or the local database.

## Add these files

- `src/server/clinic-master-data/errors.ts`
- `src/server/clinic-master-data/http.ts`
- `src/server/clinic-master-data/master-data.ts`
- `src/server/clinic-master-data/master-data-validation.ts`
- `src/app/api/clinic/master-data/route.ts`
- `src/app/api/clinic/master-data/specialties/[specialtyId]/route.ts`
- `src/app/api/clinic/master-data/doctors/[doctorId]/route.ts`
- `src/app/api/clinic/master-data/doctor-specialties/route.ts`
- `src/app/api/clinic/master-data/services/route.ts`
- `src/app/api/clinic/master-data/services/[serviceId]/route.ts`
- `src/app/api/clinic/master-data/doctor-services/route.ts`
- `src/app/api/public/clinic-catalog/route.ts`
- `tests/unit/clinic-master-data-validation.test.ts`
- `tests/unit/clinic-master-data-permission.test.ts`
- `tests/e2e/clinic-master-data.spec.ts`
- `docs/master-data/phase-4c-clinic-master-data.md`
- `UPDATE_31_FILE_GUIDE.md`
- `UPDATE_31_SUMMARY.txt`

## Replace these files

- `src/server/auth/authorization/types.ts`
- `src/server/auth/authorization/policy.ts`
- `README.md`
- `docs/implementation-roadmap.md`

## Database and dependencies

- No Prisma schema change.
- No migration to apply.
- No `npm install` or package-lock change.
- No `prisma generate` required.
- No seed execution or database data rewrite.
- No environment variable changes.

## Security and data behavior

The new `clinic.master-data.manage` permission is granted only to Clinic Manager and System Admin. All write endpoints enforce the existing employee permission route guard and same-origin check. Mutations write the corresponding audit record in the same database transaction.

The public catalog returns only public doctor profile fields and active services. It does not expose employee IDs, employee numbers, emails, or phone numbers. Current doctor-service prices are maintained in EGP. Existing Appointment `bookedPrice` snapshots are never modified by a price update.

## Validation commands

Run in this exact order:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected after this update:

- 130 Unit tests across 17 test files.
- 24 E2E tests.
- Typecheck, ESLint, and production build pass.

The baseline from Update 30 was 107 unit tests and 22 E2E tests. Update 31 adds 23 unit cases and 2 E2E cases.

## Not included

This package implements the server API and validation only. Master-data screens remain planned for Phase 11. Lab test and radiology procedure/resource maintenance is Phase 4D. Appointment slot generation and booking are Phase 6.
