# MERUNO Update 73 — Fix 02: Homepage Heading Accessible Name

## Cause
The homepage heading split the sentence across a block `<span>`, but the JSX text node before the span did not contain a real trailing space. The browser accessibility tree therefore exposed the heading as `A clearer path tooutpatient care.` while the existing Playwright assertion correctly expected `A clearer path to outpatient care.`.

## Apply
1. Stop the Next.js dev server.
2. Extract this ZIP into the existing `clinic-booking` project root.
3. Merge folders and replace only `src/app/page.tsx`.
4. Do not change the Playwright assertion; its expected accessible heading is correct.

## Exact change
The heading now inserts an explicit JSX whitespace node between the two text parts:

```tsx
<h1 className="...">
  A clearer path to{" "}
  <span className="block text-[#176B67]">outpatient care.</span>
</h1>
```

This preserves the existing two-line visual design while exposing the correct accessible name.

## Verification
Run the focused public-site suite first:

```powershell
npx playwright test tests/e2e/public-site.spec.ts --workers=1 --reporter=list
```

If it passes, continue with the full established checks:

```powershell
npm run typecheck
npm run lint
npm test
npx playwright test --workers=1
npm run build
```

No dependencies, database schema, migrations, environment variables, API contracts, or business logic are changed.
