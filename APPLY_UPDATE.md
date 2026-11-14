# Apply MERUNO Phase 10 Portal and Footer Completion

## Before applying

1. Stop the Next.js development server.
2. Back up the current project folder or create a Git commit.
3. Extract this ZIP into a temporary folder.
4. Merge the included `src`, `tests`, and `docs` folders into the existing `clinic-booking` project root.
5. Replace only the files listed in `FILE_GUIDE.md` when prompted.

## Protected files

Do not replace or modify:

- `.env`
- `.git`
- `node_modules`
- `.next`
- `generated/prisma`
- `package.json`
- `package-lock.json`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma7.config.ts`
- Any other file not listed in `FILE_GUIDE.md`

## Database and dependencies

- No Prisma schema changes.
- No migration, seed, `db push`, reset, or database write.
- No `npm install` and no new dependency.
- The new visit detail API reuses the existing patient authorization guard and current Encounter data.

## Verify

Run from the project root:

```bash
npm run typecheck
npm run lint
npx vitest run tests/unit/patient-booking-context-policy.test.ts tests/unit/patient-portal-update76-validation.test.ts
npx playwright test tests/e2e/public-site.spec.ts tests/e2e/patient-portal.spec.ts tests/e2e/patient-portal-update76.spec.ts --workers=1 --reporter=list
npm run build
```

## Manual browser review

1. Open `/` and scroll to the footer. Confirm the mint background, full MERUNO mark/wordmark, grouped links, and `Sign in` destination.
2. Open the mobile navigation and confirm the account entry is labelled `Sign in`.
3. Sign in with a verified patient account linked to a patient record.
4. Open `/portal` and review the appointment, visit, prescription, lab-result, and radiology-report counts. Empty states should be shown when the patient has no released records.
5. Open **Visit History**, then open one completed visit. Confirm the detail page shows only its completed visit metadata and diagnoses.
6. Open **Medical Records** and try `Print / Save as PDF` for a prescription or released result. A browser print window should open.
7. Check all patient portal links from the desktop sidebar and mobile Menu.

A page can legitimately show zero counts or empty states when the synthetic patient has no corresponding appointments or released records.
