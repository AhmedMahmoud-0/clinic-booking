# Apply MERUNO Update 73 Fix 01 — Homepage Route Alignment

## Why this fix is needed

The Update 73 homepage was placed at `src/app/(public)/page.tsx`. The original Phase 1 homepage is mounted at the root route `src/app/page.tsx`, so the browser continued to serve the old Phase 1 homepage. The new E2E assertion correctly checked the new Update 73 heading but encountered the old page.

This fix places the Update 73 homepage at the existing root route and keeps it inside the shared public header/footer layout. The About and Services pages remain in the `(public)` route group.

## Apply

1. Stop the Next.js dev server and close any running Playwright process.
2. Back up the current `src/app/page.tsx`.
3. Extract this ZIP into the `clinic-booking` project root and merge folders.
4. Replace this existing file:
   - `src/app/page.tsx`
5. **Delete the misplaced page file created by Update 73:**
   - `src/app/(public)/page.tsx`

   Delete only that file. Keep `src/app/(public)/layout.tsx`, `about/`, `services/`, and `loading.tsx`.

## Do not change

- `src/app/layout.tsx`
- `src/app/globals.css`
- Any About or Services page files
- `src/components/public-site/`
- `src/server/public-site/`
- Prisma schema, migrations, generated client, dependencies, `.env`, `.git`, or the database

## Re-run verification

Run from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

The public-site E2E test should now find the `A clearer path to outpatient care.` heading at `/`, while About and Services continue to be served by the `(public)` route group.

If these checks pass, continue with:

```powershell
npm run build
```

No database command, migration, seed, `npm install`, or dependency change is required.
