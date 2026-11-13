# MERUNO Authentication UI — Fix 04

## Purpose

Fix the TypeScript nullable-token error in the reset-password form without changing the authentication flow or security policy.

## Apply

1. Stop the Next.js development server.
2. Extract this ZIP into the `clinic-booking` project root.
3. Merge the included `src` folder into the existing `src` folder.
4. Replace only:
   - `src/components/auth/reset-password-form.tsx`

## Preserved behavior

- Missing or invalid reset tokens continue to show the invalid/expired-link state.
- The reset API is called only when a non-empty token is available.
- Password confirmation, minimum length, error handling, and success behavior remain unchanged.
- No authorization policy, database schema, migration, dependency, environment file, or package manifest is changed.

## Verification

Run the agreed project checks after applying the fix. The two reported Playwright `ERR_CONNECTION_RESET` / `ERR_CONNECTION_REFUSED` failures were transport/server interruptions rather than assertion failures; rerun the lifecycle tests after the TypeScript build issue is corrected to determine whether they recur.
