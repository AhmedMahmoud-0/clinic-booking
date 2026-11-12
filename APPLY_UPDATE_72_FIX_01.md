# MERUNO Update 72 — Fix 01 (TypeScript)

This fix addresses the nine TypeScript errors reported after applying Update 72.

## Files

Replace these four files at the project root:

- `src/server/billing/billing-phase-9a.ts`
- `src/server/billing/billing-phase-9b.ts`
- `src/server/billing/billing-phase-9b-policy.ts`
- `tests/unit/billing-phase-9b-policy.test.ts`

No Prisma schema changes or migration are included. Do not run any database command for this fix.

## Verify

Run:

```bash
npm run typecheck
npm run lint
npm test
```

If these pass, continue with the remaining Update 72 checks:

```bash
npx playwright test --workers=1
npm run build
```

Send the complete output if any command fails. Do not proceed to another phase until all Update 72 checks pass.
