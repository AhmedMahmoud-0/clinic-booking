# Apply Update 69 Fix 03

This fix addresses the sole failing Unit Test and removes two ESLint unused-variable warnings reported after Update 69 Fix 02.

## Files replaced

- `src/server/laboratory/external-lab-validation.ts`
  - Requires a meaningful Reception conversion reason of at least 10 trimmed characters. This matches the existing test expectation that `"short"` is rejected while the full identity recheck reason is accepted.
  - Removes an unused duplicate `intakeOriginSchema`; the active `externalLabIntakeUnionSchema` remains the intake validator.
- `src/server/laboratory/lab-workflow.ts`
  - Removes the unused `CollectionItemSource` type alias. Runtime logic is unchanged.

## Apply

Extract this ZIP into the project root and replace the two files above. Keep Update 69 Fix 01 and Fix 02 applied. No Prisma schema, migration, database, package, or environment changes are required.

Run:

```bash
npm run lint
npm test
```

Expected Unit Test total remains 1,138 (one previously failing test should now pass). Then proceed with the already-planned E2E and production build checks once both commands pass.
