# APPLY UPDATE 33 — FIX 01

## Purpose

Fix Egyptian phone-number equivalence during patient duplicate matching. Local numbers such as `01012345678` and international `+20 10 1234 5678` represent the same phone number. The previous implementation stripped punctuation/digits but compared the resulting strings literally, so local and country-code forms did not match.

## Apply

1. Confirm Update 33 is already applied.
2. Extract this ZIP over the existing project root.
3. Replace the three listed source/test files and the documentation files included in this package.
4. Do not replace `.env`, Prisma schema, migrations, generated Prisma client, dependencies, or other project files.

## Files replaced

- `src/server/patient-management/validation.ts`
- `src/server/patient-management/patient-registration.ts`
- `tests/unit/patient-registration-validation.test.ts`
- `docs/patients/phase-5a-patient-registration.md`
- `docs/implementation-roadmap.md`
- `README.md`
- `UPDATE_33_FILE_GUIDE.md`

## Behavior

- Keep `normalizePatientPhone` as the digits-only normalizer, preserving the existing Arabic-Indic and Eastern Arabic-Indic behavior.
- Compare Egyptian local 0-prefixed numbers and their `+20` representation using a common comparison key.
- Query both canonical and legacy digits-only forms from `PatientContact.normalizedValue`, so existing patient rows remain searchable without bulk rewriting.
- Do not treat a shared phone as a high-confidence duplicate. High confidence still requires exact full name plus date of birth. Phone-only or ambiguous shared-family matches remain `REVIEW` candidates.
- The registration-time serializable duplicate re-check uses the same expanded phone lookup.

## Database and dependencies

- No Prisma schema change.
- No migration and no database write.
- No `db:generate`, `db:seed`, `db push`, or `migrate reset`.
- No dependency installation or environment change.
- Existing patient contacts are not rewritten.

## Validation — exact order

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected after Update 33 + Fix 01:

- 185 Unit tests (183 from Update 33 baseline plus 2 phone-compatibility tests).
- 28 E2E tests.
- Typecheck, lint, and production build pass.

Unit coverage includes local-to-+20 matching, backwards-compatible database lookup variants, and the rule that a shared phone does not alone block registration.
