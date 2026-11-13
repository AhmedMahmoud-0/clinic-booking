# Apply MERUNO Update 76

## 1. Merge the package

1. Stop the Next.js development server.
2. Commit or back up the currently accepted Update 75 state.
3. Extract this ZIP into a temporary folder.
4. Merge its `src`, `tests`, and `docs` folders into the existing `clinic-booking` project root.
5. Replace the existing `src/components/patient-portal/patient-portal-shell.tsx` with the package version.
6. Add all other files at the exact paths listed in `UPDATE_76_FILE_GUIDE.md`.

Do not overwrite `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, the package manifests, lockfile, database files, or migrations.

## 2. Database and dependencies

- No database migration or Prisma schema change is required.
- Do not run `db push`, reset, seed, or migration commands for this Update.
- No package/dependency installation is required.

## 3. Focused verification

Run from the project root:

```powershell
npm run typecheck
npm run lint
npx vitest run tests/unit/patient-portal-update76-validation.test.ts
npx playwright test tests/e2e/patient-portal-update76.spec.ts --workers=1 --reporter=list
npm run build
```

After focused checks, run the full established project suite once:

```powershell
npm test
npx playwright test --workers=1 --reporter=list
```

Stop at the first failure and capture the first complete error block. Do not rerun the entire suite repeatedly for the same unchanged failure.

## 4. Manual verification with synthetic patient data

Sign in with an active verified patient account and review:

- `/portal/records`
- `/portal/billing`
- `/portal/complaints`
- `/portal/notifications`

Confirm:

- Draft/in-progress encounters and prescriptions never appear.
- Laboratory records appear only after `RELEASED` and `releasedAt` is set.
- Radiology reports appear only after `RELEASED` and `releasedAt` is set.
- Draft/voided invoices and non-completed payments are omitted.
- A submitted complaint receives a reference number and begins in `RECEIVED` state; it appears in the account's complaint list after refresh.
- A notification can be marked read; another patient's notification cannot be targeted through the portal route.
- These new pages show only the signed-in patient's own data. They do not switch into a delegated family-member record context.
- The new navigation remains usable at mobile widths.

Use only synthetic patient records. Do not use production patient data for screenshots or manual tests.

## 5. Verification status and known scope limits

This package is prepared for local verification; it is not marked closed until the developer confirms local results. Patient data-copy/correction requests and patient-authorized clinical attachment downloads are not implemented because the inspected domain/service contracts did not provide safe persistence/authorization workflows for them. Existing in-app notifications are read-only except for the current patient's mark-as-read action; no delivery mechanism is introduced.
