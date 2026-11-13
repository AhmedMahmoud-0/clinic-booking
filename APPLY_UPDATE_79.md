# Apply MERUNO Update 79 — System Administration

## Before applying

1. Confirm Update 77, Update 78, and Update 78 Fix 01–03 are already applied. The latest local tests reported by the developer passed after Fix 03.
2. Back up the current project folder or create a Git commit.
3. Stop any running Next.js development server before running Playwright.

## Apply

1. Extract this ZIP into the existing `clinic-booking` project root.
2. Merge the included `src`, `tests`, and `docs` folders into the matching folders.
3. All files in this package are new; do not replace or delete unrelated local files.
4. Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, or the local PostgreSQL database.
5. No `npm install`, Prisma generation, migration, seed, `db push`, or database reset is required.

## Verify in this order

```powershell
npm run typecheck
npm run lint
npx vitest run tests/unit/system-admin-policy.test.ts
npx playwright test tests/e2e/system-admin-workspace.spec.ts --workers=1 --reporter=list
npm run build
```

Stop at the first failure and share the complete error output. Playwright manages its own web server; do not leave a separate `npm run dev` process on the configured port.

## Expected access behavior

- Anonymous navigation to every `/system-admin/*` page redirects to `/login`.
- Anonymous requests to the System Admin APIs return HTTP 401 and `Cache-Control: no-store`.
- An authenticated employee without the relevant System Admin operation permission is rejected by the API/workspace guard.
- `CLINIC_MANAGER` does not inherit `SYSTEM_ADMIN` access.

## Important notes

- The new System Admin workspace does not add database-backed custom roles or editable permissions. The existing permission matrix is static application policy.
- The settings page is informational only because the current schema has no persisted system settings model.
- Master-data and schedule pages are read-only summaries and reuse existing data sources. No competing catalog/scheduling business logic is added.
- Role grants/revocations require an audit reason, are recorded transactionally, and cannot remove the last verified active System Admin.
- Do not enter or store real patient information in the portfolio demo.
