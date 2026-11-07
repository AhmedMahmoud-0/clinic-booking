# MERUNO Update 28 — Fix 01: Consultation-room migration test syntax

## Purpose

Corrects a TypeScript string-literal quoting error in the new migration-contract test added by Update 28. The SQL migration and Prisma schema are not changed by this fix.

## Apply

Apply this ZIP over the project after Update 28. Replace:

- `tests/unit/consultation-room-migration.test.ts`
- `README.md`
- `docs/implementation-roadmap.md`
- `docs/database/phase-4a-consultation-rooms.md`

The remaining files in this package are documentation for this fix. Do not replace `.env`, dependencies, generated Prisma files, or any migration directory.

## Why the test failed

The assertion used a double-quoted JavaScript string containing unescaped double quotes around SQL identifiers (`"startsAt"` and `"endsAt"`). That closed the TypeScript string early and prevented the entire test file from parsing. The SQL itself is valid and the migration is not implicated by this syntax error.

The corrected assertion uses a template literal:

```ts
expect(migrationSql).toContain(`tstzrange("startsAt", "endsAt", '[)') WITH &&`);
```

## Database impact

None. This fix does not change Prisma schema, migration SQL, migration history, or database contents. Do not rerun `prisma migrate deploy` because of this test-only correction. The Update 28 migration remains applied/pending exactly as it was before this fix.

## Verification

Run in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected baseline: 89 unit tests across 12 test files, and 22 E2E tests. Confirm the existing consultation-room migration-contract suite now contributes 3 passing tests.
