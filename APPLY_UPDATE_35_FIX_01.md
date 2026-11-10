# MERUNO Update 35 — Fix 01: Email normalization and test type safety

## Why this fix is needed

The first local verification of Update 35 found one related issue in the new contact-validation test and schema:

- The test accessed `.value` on the full discriminated-union result without narrowing it to `ADD_CONTACT`, which caused TypeScript error TS2339.
- The email validator checked a lowercased copy but the command schema returned the original uppercase value, causing the email-normalization unit test to fail.

Fix 01 corrects both issues at their source. Email contact commands are now transformed to lowercase after trimming; phone values and other command shapes are unchanged. The test asserts the complete expected parsed object, so it remains valid for the union type.

## Files to replace

1. `src/server/patient-management/patient-contact-consent-validation.ts`
2. `tests/unit/patient-contact-consent-validation.test.ts`
3. `docs/patients/phase-5c-patient-contacts-and-consents.md`
4. `docs/implementation-roadmap.md`
5. `README.md`

## Apply

1. Keep a backup or commit the current project folder.
2. Extract this Fix 01 ZIP into the existing `clinic-booking` project root and merge folders.
3. Replace only the five files listed above.
4. Keep your existing Prisma schema, migration folders, generated Prisma client, `.env`, package files, local database, and all other project files.

## Database and dependencies

- **No migration is required.** Your local database already reports six migrations up to date, including `20261108030000_patient_contacts_and_consents`.
- Do not rerun `migrate deploy`, `migrate dev`, `db push`, or `db seed` for this fix.
- No Prisma generation or dependency installation is required.
- No database rows or schema objects are changed.

## Verification

Run the five checks in this exact order from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected results, assuming the local suite has not otherwise changed:

- 259/259 unit tests pass.
- 33/33 Playwright E2E tests pass.
- Typecheck, lint, and production build pass.

The previous run already passed lint and all 33 E2E tests. The unit suite had 258 passing and one failing test; typecheck and build stopped on the union-result typing issue described above. Run all five again after applying the fix to verify the integrated state.

## Scope

This is a validation/test correction only. It does not change contact-profile routes, permission policy, consent-event rules, schema, migration, or the append-only history guarantees.
