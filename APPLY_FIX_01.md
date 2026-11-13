# MERUNO Update 78 — Fix 01

## Purpose

This focused fix addresses the two issues reported after Update 78:

1. ESLint `react/no-unescaped-entities` in the Clinic Manager complaints page.
2. The Reception complaint-intake page has two valid unauthenticated/unauthorized outcomes: an anonymous visitor is redirected to `/login`, while an authenticated account without the dedicated `complaint.intake` permission is shown the explicit `Complaint intake is restricted` page. The previous E2E assertion incorrectly expected both cases to redirect.

## Files

- `src/components/clinic-manager/complaints-management-view.tsx` — escapes the apostrophe in JSX text; no behavior change.
- `tests/e2e/clinic-manager-operations.spec.ts` — separates Clinic Manager login redirects from Reception permission-denial behavior and verifies the intake form is not exposed to an account without permission.

## Apply

1. Stop any running `npm run dev` process.
2. Extract this ZIP into the project root, preserving the `src` and `tests` paths.
3. Replace only the two listed files. Preserve unrelated local changes.
4. Do not apply Update 78 Fix 02, and do not make schema, migration, dependency, or environment changes for this fix.

## Verify

```powershell
npm run lint
npx playwright test tests/e2e/clinic-manager-operations.spec.ts --workers=1 --reporter=list
```

Typecheck, unit tests, and production build do not need to be rerun for these two focused edits. If the focused checks pass, Update 78 can be closed based on the earlier successful typecheck, 11/11 unit tests, and production build.
