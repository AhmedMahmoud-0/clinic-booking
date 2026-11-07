# Phase 3G-B2 — Controlled Employee Invitations

## E2E origin alignment — Update 26 Fix 01

The first local validation run passed typecheck, lint, all 64 unit tests, and production build. Sixteen of seventeen E2E tests passed. The remaining signed-out acceptance test expected `401` but received `403`.

The acceptance route checks `assertAccountLinkOrigin(request)` before calling `getAuthSession()`. That ordering is intentional: a mutation request from an untrusted origin must be rejected before the route evaluates or changes authenticated state. The test had a hard-coded `Origin` of `https://localhost:3100`, while the server-side guard compares it with the normalized `BETTER_AUTH_URL`. The mismatch caused `403 INVALID_ORIGIN`; the signed-out session branch was never reached.

Update 26 Fix 01 aligns Playwright's `baseURL`, web server protocol/port, and API-test Origin with the same `BETTER_AUTH_URL`. Its first rerun exposed a module-loader issue: Node did not expose `loadEnvConfig` as a named ESM export from the installed `@next/env` package. Update 26 Fix 02 uses Node's `createRequire` to load the package through its CommonJS-compatible interface, while preserving the same environment-loading behavior. The signed-out acceptance test can then exercise the intended path: valid same-origin request, no authenticated session, `401` with `Cache-Control: no-store`.

No server route, authentication policy, CSRF/origin guard, invitation logic, database schema, migration, dependency, or environment secret changes. The value of `BETTER_AUTH_URL` must identify the exact origin used by the local app; never share `BETTER_AUTH_SECRET` or `DATABASE_URL`.

## Phase status

Phase 3G-B2 remains **implemented; local verification pending** until the full five-command validation sequence passes after applying Fix 02.

## Invitation behavior

- Only System Admin can issue, resend, or revoke invitations using the existing `employee.account.link` permission.
- An invitation targets an existing active Employee's current work email and expires after 72 hours.
- Only a one-time token digest is stored in the existing Better Auth `Verification` table.
- The invitee must create or use a Better Auth identity for the invited address, verify that address, sign in, and explicitly accept.
- Acceptance creates only `EmployeeAccount`, associates the existing Employee, and records an audit event. It does not create an Employee or assign a role.
- The existing Prisma schema, migrations, and database are unchanged.
