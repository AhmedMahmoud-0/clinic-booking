# MERUNO Update 24 — Fix 01 (Phase 3G-A)

This is a focused correction for the three issues found during local validation of Update 24. It does not replace Update 24 and does not introduce a new feature.

## Files to replace

1. `src/components/auth/reset-password-form.tsx`
   - Captures the reset token in a constant after the invalid/missing-token guard.
   - Passes the narrowed `string` value to `authClient.resetPassword`, resolving the TypeScript `string | null` mismatch without weakening types or allowing a missing token through.
2. `tests/e2e/auth-entry.spec.ts`
   - Locates the password input by its exact textbox role/name, rather than matching both the input and the accessible “Show password” button.
3. `tests/e2e/auth-lifecycle.spec.ts`
   - Locates the registration password input by exact textbox role/name, avoiding an ambiguous match with the confirmation field.

## Apply

1. Extract this ZIP into the existing `clinic-booking` project root.
2. Merge the folders and replace only the three files listed above.
3. Do not reapply the full Update 24 ZIP. Do not replace `.env`, dependencies, Prisma schema/migrations, generated Prisma files, or the database.

## Dependencies and database

- No dependency installation is required.
- No Prisma generation or database migration is required.
- No environment variables or database records are changed.

## Validate in this exact order

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected results, assuming no other local changes: typecheck and lint pass, 41 unit tests pass, all 11 E2E tests pass, and production build passes.
