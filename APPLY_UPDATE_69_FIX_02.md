# MERUNO Update 69 — Fix 02

## Purpose
Correct the Prisma `select` nesting in the critical laboratory result communication query. The `externalIntake` relation must be inside the nested `LabOrder.select` object. The malformed nesting caused Prisma to reject the query and TypeScript to infer an incomplete scalar-only result type, producing the related `values` and `orderItem` errors.

## Files
Replace only:
- `src/server/laboratory/lab-result-review.ts`

This fix does not modify the Prisma schema, migrations, database, dependencies, environment, or any other file. Keep Update 69 Fix 01 applied.

## Apply
1. Extract this ZIP into the project root and overwrite the listed file.
2. Run:

```bash
npm run typecheck
```

3. If typecheck succeeds, continue:

```bash
npm run lint
npm test
```

Do not run any migration or database reset for this fix. If typecheck still reports an error, send the complete output before proceeding to E2E tests.
