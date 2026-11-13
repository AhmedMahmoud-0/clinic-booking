# Apply MERUNO Update 75 — Patient Portal Foundation

## 1. Back up and merge

1. Stop the Next.js development server.
2. Create a backup or commit the currently accepted Update 74 state.
3. Extract this ZIP into a temporary folder.
4. Merge the extracted `src`, `tests`, and `docs` folders into the existing `clinic-booking` project root.
5. Replace the existing `src/app/api/patient/appointments/route.ts` with the package version. It preserves the existing Phase 6B1 POST booking contract and adds only a GET list operation.
6. Add all other new files at the exact paths in `UPDATE_75_FILE_GUIDE.md`.

Do not overwrite `.env`, `.git`, `node_modules`, `.next`, generated Prisma files, package files, or database files.

## 2. Database and dependencies

- No Prisma schema changes.
- No migrations, seeds, `db push`, or database reset.
- No package or dependency changes.

## 3. Focused verification

Run from the project root:

```powershell
npm run typecheck
npm run lint
npx playwright test tests/e2e/patient-portal.spec.ts --workers=1 --reporter=list
npm run build
```

The focused E2E test verifies that anonymous users cannot open portal routes or read patient portal APIs. Existing Phase 6C cancellation/rescheduling tests remain the source of truth for those server-side rules; this Update only wires the UI to those existing operations.

## 4. Manual browser review

Sign in with an active, verified patient account, then review:

- `/portal`
- `/portal/appointments`
- One appointment detail from the list.
- `/portal/visits`
- `/portal/family`
- `/portal/profile`
- `/auth/account-security`

Confirm that the mobile menu works, the profile page is read-only, only completed visits are listed, and the Family & Access page shows only the delegation scopes returned by the existing patient delegation API.

For appointment actions, verify a confirmed appointment at least 24 hours away in the synthetic test data. The existing server service independently rechecks permission, time window, and availability. A slot may become unavailable between lookup and submission; the API's response remains authoritative.

## 5. Important behavior

- Anonymous users are redirected to `/login`.
- A signed-in account without a verified patient identity sees an access-required page; it is not silently given a patient profile.
- New read endpoints derive `patientId` only from `withPatientPortalRoute()` and query only that patient's own data.
- A delegated booking scope is not treated as permission to view records or manage appointments.
- Patient cancellation/rescheduling uses the existing Phase 6C routes and policies. Changes inside the 24-hour window are directed to Reception.
- Profile fields are intentionally read-only because there is no existing patient self-edit API in the inspected project files.
- Visit history exposes completed encounter dates and doctor/specialty labels only, not draft or internal clinical content.
