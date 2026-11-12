# MERUNO Update70 — Fix01

## Purpose
Fix the TypeScript errors reported immediately after applying Update70, without changing the database schema or Migration16.

## Files included
- `src/server/auth/authorization/types.ts`
  - Restores `APPOINTMENT_PATIENT_OVERLAP_OVERRIDE` (`appointment.patient-overlap.override`).
- `src/server/auth/authorization/policy.ts`
  - Restores this permission for **RECEPTION only**, preserving the Update44 least-privilege rule.
- `src/server/radiology/radiology-phase-8i-j.ts`
  - Changes the `fail` helper from a `const` arrow function to a named `never`-returning function declaration. This allows TypeScript control-flow analysis to narrow records after not-found guards, eliminating the reported TS18047 nullability errors without weakening strict null checks.
- `tests/unit/radiology-phase-8i-j-authorization.test.ts`
  - Adds a regression test that the overlap override remains Reception-only.

## Apply
1. Extract this ZIP into the project root and allow the four files to overwrite their matching paths.
2. Do not re-run or modify Migration16 for this fix. It has no Prisma schema or migration changes.
3. Run first:

```bash
npm run typecheck
```

4. If typecheck passes, continue:

```bash
npm run lint
npm test
npx playwright test --workers=1
npm run build
```

Do not use `prisma db push`, `prisma migrate reset`, or `prisma migrate dev`.
