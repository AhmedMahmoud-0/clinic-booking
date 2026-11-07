# Apply MERUNO Update 09 — Phase 2C

1. Extract this ZIP into the existing project root: `C:\Users\PC\clinic-booking\clinic-booking`.
2. Replace only these files:
   - `prisma/schema.prisma`
   - `README.md`
   - `docs/implementation-roadmap.md`
   - `docs/architecture.md`
3. Add this new file:
   - `docs/database/phase-2c-laboratory-radiology.md`
4. Do not replace or delete `.git`, `.env`, `node_modules`, `.next`, `generated/prisma`, or any file not listed above.
5. This is a Prisma schema/documentation update only. It includes no migration, seed script, `db push`, reset, or database write.

## Run the full verification batch after applying

Run each command as a separate PowerShell command, in this order:

```powershell
npm run db:validate
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

A failure in any command must be resolved before treating Update 09 as verified. Stop an existing development server on port 3000 before Playwright if it conflicts with the test server.
