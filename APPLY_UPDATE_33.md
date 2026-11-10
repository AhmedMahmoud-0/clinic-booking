# APPLY UPDATE 33 — Phase 5A Patient Registration & Duplicate Prevention

## Apply

1. Confirm the current project already includes the locally verified Updates 28–32 and Update 31 Fix 01.
2. Extract this ZIP over the existing project root.
3. Add the new `src/server/patient-management/` files, the two API route folders, the unit/E2E tests, and the patient workflow documentation.
4. Replace `README.md` and `docs/implementation-roadmap.md` with the versions in this package.
5. Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, or any migration.

## Database and dependencies

- No Prisma schema change.
- No migration; migration count must remain unchanged.
- No `db:generate`, `db:seed`, `db push`, or `migrate reset`.
- No dependency installation and no environment variable changes.
- Existing Patient records and contacts are not rewritten.

## Validation — run in this exact order

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected after adding this update:

- 183 Unit tests (baseline 157 + 26 new).
- 28 E2E tests (baseline 26 + 2 new).
- Typecheck, lint, and production build pass.

## Notes

The E2E tests cover unauthorized access boundaries only. The registration/duplicate logic is covered by unit tests and must later be exercised with a synthetic authorized Reception account during Phase 12 integration testing. No real patient data should be used.
