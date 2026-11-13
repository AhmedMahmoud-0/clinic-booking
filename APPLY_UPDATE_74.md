# Apply MERUNO Update 74 — Phase 10 Public Discovery and Booking UI

## 1. Back up and copy

1. Commit the currently accepted Update 73 state or create a project backup.
2. Extract this ZIP into the existing `clinic-booking` project root.
3. Merge the `src`, `tests`, and `docs` folders into the project root.
4. Replace these three existing files: `src/components/public-site/public-site-header.tsx`, `src/components/public-site/public-site-footer.tsx`, and `docs/implementation-roadmap.md`.
5. Add every other file at the exact path listed in `UPDATE_74_FILE_GUIDE.md`; do not replace unrelated files.
6. Do not replace `.env`, `.git`, `node_modules`, `.next`, generated Prisma files, package files, or database files.

## 2. Database and dependencies

No Prisma schema, migration, seed, package, dependency, or environment change is included. Do not run `migrate reset`, `db push`, or any destructive database command for this Update.

## 3. Run focused checks first

Run from the project root in this order:

```powershell
npm run typecheck
npm run lint
npm test -- tests/unit/patient-booking-context-policy.test.ts
npx playwright test tests/e2e/public-discovery-booking.spec.ts --workers=1 --reporter=list
npm run build
```

The new unit tests exercise the patient booking-context authorization projection. The focused Playwright file checks the new public routes and anonymous booking-context protection. Existing booking endpoints have already been covered by their earlier Phase 6 tests and are reused without changes.

If `npm test` is configured to run the full Vitest suite regardless of trailing arguments, use the repository's existing Vitest command directly:

```powershell
npx vitest run tests/unit/patient-booking-context-policy.test.ts
```

## 4. Broader verification

After the focused checks pass, run the complete Vitest suite as normal. The complete Playwright suite can be run after that; use `--workers=1` to match the current project configuration and capture any failure with its actual error context. The earlier Update 73 intermittent timeouts did not reproduce in the focused 10-test run, so do not modify routes or increase timeouts without evidence.

## 5. Important functional/security notes

- Public catalogue pages render only active/public records from Phase 4C.
- Only bookable doctors with active consultation/follow-up services appear in the booking flow.
- Time slots come from the existing `/api/public/appointment-availability` endpoint; the UI does not create or reserve slots.
- Guest booking requires a full name and phone. Email is optional. The UI submits the existing strict guest contract and does not create a Patient or MRN.
- Account booking loads choices from `/api/patient/booking-context`. This route derives the actor from the verified patient session and returns only self plus exact active `BOOK_APPOINTMENTS` relationships that pass the existing server policy.
- The patient appointment POST independently rechecks authority. A client-provided patient ID is not treated as permission.
- Availability is advisory. The existing booking transaction is authoritative and may return 409 if the selected slot has been taken.
- The one-time guest management token is displayed once in the immediate confirmation view. It is not stored in local storage or put in a URL; the guest must keep it private.
- The Contact page intentionally contains no invented clinic contact details. Privacy and Terms are explicitly labelled draft demo content pending legal review.
- Public UI is English-only and LTR-only.

This remains a synthetic-data portfolio demonstration, not a production clinical service.
