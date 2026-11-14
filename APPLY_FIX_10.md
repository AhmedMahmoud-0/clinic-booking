# MERUNO Public Site Fix 10 — Homepage Mobile Overflow and About Navigation

## Apply
1. Stop the Next.js development server.
2. Extract this ZIP into a temporary folder.
3. Merge the included `src` and `tests` folders into the existing project root.
4. Replace only the four files listed in `FILE_GUIDE.md`.
5. Do not replace `.env`, `.git`, `node_modules`, `.next`, generated Prisma files, package manifests, Prisma schema, migrations, or the local database.

## What this fixes
- Prevents narrow-screen flex content in the homepage feature panel from forcing the page wider than the viewport.
- Applies width constraints to the homepage main/hero content and clips decorative overflow at the public layout boundary without changing the desktop composition.
- Keeps the About page title container width-safe.
- Makes the public navigation test verify the actual About and Services link destinations and load each destination route deterministically before checking its content. This avoids relying on a flaky client transition during the route-content assertion.

## Verification
Run these from the project root:

```powershell
npm run typecheck
npm run lint
npx vitest run tests/unit/patient-booking-context-policy.test.ts tests/unit/patient-portal-update76-validation.test.ts
npx playwright test tests/e2e/public-site.spec.ts tests/e2e/patient-portal.spec.ts tests/e2e/patient-portal-update76.spec.ts --workers=1 --reporter=list
npm run build
```
