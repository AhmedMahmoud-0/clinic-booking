# Apply MERUNO Update 74 — Fix 02

## Purpose

This focused repair addresses the two remaining failures from the last Playwright run:

1. The doctor Specialty filter must expose an explicit, stable accessible name (`Specialty`).
2. The shared public shell and its flex children must not expand beyond a narrow mobile viewport. The wrapper now clips horizontal overflow and the shared header/footer/content columns use `min-w-0` / constrained grid tracks.

## Files to replace

Replace only these four application files:

- `src/components/public-site/doctor-directory.tsx`
- `src/components/public-site/public-site-layout.tsx`
- `src/components/public-site/public-site-header.tsx`
- `src/components/public-site/public-site-footer.tsx`

Do not replace tests, `globals.css`, root layout, routes, database files, dependencies, or any other application file.

## Apply

1. Stop the Next.js dev server.
2. Extract the ZIP into a temporary folder.
3. Copy the included `src` folder into the project root and replace the four files above.
4. Restart the test command below.

No database operation, migration, package installation, or generated-client command is required.
