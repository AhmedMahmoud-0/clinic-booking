# MERUNO Update 73 — Fix 03: Remove Duplicate Skip Link

## Cause

The application's existing root layout already renders the global **Skip to main content** link. `PublicSiteLayout` added a second link with the same accessible name and target. Playwright's strict locator correctly failed because `getByRole("link", { name: "Skip to main content" })` matched two elements.

## Apply

1. Stop the Next.js development server.
2. Extract this ZIP into the existing `clinic-booking` project root.
3. Merge folders when prompted.
4. Replace this one file only:
   - `src/components/public-site/public-site-layout.tsx`
5. Do not delete or modify the root layout's existing skip link. Do not change the Playwright test.

The global root-level skip link remains the single accessible entry point and continues to target `#main-content`. The Home, About, and Services pages already expose that target on their main content element.

## Verify

Run the focused public-site tests first:

```powershell
npx playwright test tests/e2e/public-site.spec.ts --workers=1 --reporter=list
```

If those pass, run the full project checks in the established order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

No database, Prisma schema, migration, dependency, translation, or test changes are included.
