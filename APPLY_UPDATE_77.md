# Apply MERUNO Update 77

1. Stop any running `npm run dev` process before running the test suite. Let Playwright manage its configured web server; do not run a second server on `https://localhost:3000` at the same time.
2. Extract this ZIP at the project root.
3. Merge the included `src`, `tests`, and `docs` directories into the matching project directories. All paths in this package are new files; do not delete or replace unrelated files.
4. Do not edit `.env`, `.git`, `node_modules`, `.next`, generated Prisma output, package manifests, lockfiles, migrations, or the local database. This update contains no schema or migration work.
5. Run the verification commands below in order. Stop at the first failure and share the complete error output before applying any repair.

## Verification commands

```powershell
npm run typecheck
npm run lint
npx vitest run tests/unit/clinic-manager-overview-policy.test.ts
npx playwright test tests/e2e/clinic-manager-workspace.spec.ts --workers=1 --reporter=list
npm run build
```

## Expected access behavior

- Anonymous browser navigation to `/clinic-manager` and `/clinic-manager/staff` redirects to `/login`.
- Anonymous GET requests to `/api/clinic-manager/overview` and `/api/clinic-manager/staff` return HTTP 401 with `Cache-Control: no-store`.
- An authenticated employee lacking the manager's operation/staff permissions receives HTTP 403 from the relevant API or an access-denied workspace page.

## Local server note

When running Playwright, ensure no separate `npm run dev` process is using the configured web-server port. Close stale terminals that may serve an older build before retrying a failing browser test.
