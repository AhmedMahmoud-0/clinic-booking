# Apply Update 64 — Doctor Clinical-Note Signing

1. Close the Next.js dev server.
2. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
3. Replace only these existing files:
   - `README.md`
   - `docs/implementation-roadmap.md`
4. Keep all other existing project files and local data unchanged. Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, package files, Prisma config, schema, or migrations.
5. No Prisma schema change or migration is included. Do not run migration commands for this update.
6. Run the checks in order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected test totals after this increment, assuming the previous baseline is unchanged:

- Unit: 901 tests across 85 files.
- E2E: 124 tests.

The implementation is a protected API/data-layer increment only. It does not add the Doctor UI or complete the Encounter. All project data must remain synthetic; MERUNO is not production clinical software.
