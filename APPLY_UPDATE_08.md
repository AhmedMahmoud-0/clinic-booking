# Apply MERUNO Update 08 — Phase 2B

## Included files

Replace:
- `prisma/schema.prisma`

Add:
- `docs/database/phase-2b-appointments-clinical.md`

Replace documentation:
- `README.md`
- `docs/implementation-roadmap.md`

## Apply

1. Extract this archive into the project root: `C:\Users\PC\clinic-booking\clinic-booking`.
2. Allow replacement of only the three listed existing files; add the new database document.
3. Do not overwrite `.env`, `.git`, `.gitignore`, `node_modules`, `.next`, `generated/prisma`, `package.json`, or `package-lock.json`.
4. Do not run `prisma migrate`, `prisma db push`, `migrate reset`, or any SQL write command for this update.

## Verify one command at a time

Run these in order and review each result before continuing:

```powershell
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Stop at the first failure and send the complete error output. This update intentionally has no migration or seed script. Prisma validation proves schema syntax and relations, not PostgreSQL concurrency/check constraints; those are documented for Phase 2E.
