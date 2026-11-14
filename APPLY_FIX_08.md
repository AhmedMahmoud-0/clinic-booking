# MERUNO Phase 10 — Fix 08: Homepage Heading and Anonymous Portal E2E Isolation

## What this fixes

1. Restores the explicit whitespace between the two text nodes in the public homepage H1. Without it, the rendered accessible heading can be concatenated as `A clearer path tooutpatient care.`, which does not match the approved heading or the existing public-site assertion.
2. Makes the anonymous Patient Portal E2E test use a new Playwright browser context with an explicitly empty `storageState`. This prevents a project-level authenticated storage state from leaking into a test that claims to verify anonymous access. The application authorization code and the strict redirect assertion are unchanged.

## Apply

1. Stop the Next.js development server.
2. Extract this ZIP into the project root (`clinic-booking`).
3. Replace only these two files:
   - `src/app/page.tsx`
   - `tests/e2e/patient-portal.spec.ts`
4. Do not replace or modify `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, any package/lock file, Prisma schema, migrations, Prisma config, auth services, portal layout, or database.

## Database and dependencies

- No database changes or migrations.
- No package or dependency changes.
- No authorization or patient data access code changes.

## Verify

Run from the project root:

```powershell
npm run typecheck
npm run lint
npx vitest run tests/unit/patient-booking-context-policy.test.ts tests/unit/patient-portal-update76-validation.test.ts
npx playwright test tests/e2e/public-site.spec.ts tests/e2e/patient-portal.spec.ts tests/e2e/patient-portal-update76.spec.ts --workers=1 --reporter=list
npm run build
```

The anonymous route test keeps its strict expectation that every `/portal/*` page ends at `/login`; it does not weaken or bypass authorization.
