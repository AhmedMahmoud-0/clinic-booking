# Apply MERUNO Update 11 — Phase 2E

## Files to replace/add

Replace:
- `package.json`
- `README.md`
- `docs/implementation-roadmap.md`

Add:
- `scripts/create-initial-migration.mjs`
- `prisma/seed.sql`
- `docs/database/phase-2e-migration-seed.md`

Do not replace `package-lock.json`; this update adds npm scripts only and no dependencies. Do not replace `prisma/schema.prisma`, `prisma7.config.ts`, `.env`, `.git`, `node_modules`, `.next`, or `generated/prisma`.

## Apply

1. Extract the ZIP at the project root.
2. Replace only the three listed files.
3. Add the three new files at their exact paths.
4. No `npm install` is required because no dependency was added or changed.
5. Run the seven validation commands from the documentation in one batch.
6. After validation, run `npm run db:migration:preview`. This generates a draft SQL migration only; it does not apply it or modify PostgreSQL.

Do not run `npm run db:seed` until the migration has been reviewed and applied. Do not run `migrate reset` or `db push`.
