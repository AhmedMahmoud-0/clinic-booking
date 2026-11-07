# Update 25 Fix 01 — File guide

## Replaced file

| File | Change | Reason |
| --- | --- | --- |
| `tests/e2e/auth-entry.spec.ts` | Replaces three auth-entry E2E checks with explicit navigation readiness and anonymous-context setup. | Prevent a slow `load` event from consuming the whole 30-second test timeout, and make the account-status test's signed-out precondition explicit by clearing cookies. Existing locators and intended assertions are retained. |

## Deliberately unchanged application files

| File | Reason |
| --- | --- |
| `src/server/auth/session.ts` | Its current implementation correctly reads request headers and delegates session validation to Better Auth. |
| `src/app/auth/account-status/page.tsx` | It already redirects when `getAuthSession()` returns `null`. The supplied log does not prove a defect in the production guard. |

## Validation scope

This is an E2E test-only fix. It introduces no runtime code, database, dependency, or environment changes. Local validation by the project owner is still required.
