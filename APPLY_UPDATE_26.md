# Apply MERUNO Update 26 — Phase 3G-B2 Employee Invitations

## Prerequisite

Apply this package over the locally verified project state after **Update 25 + Update 25 Fix 01**. Back up the project or commit the passing state before replacing files.

## Apply

1. Extract this ZIP into the existing `clinic-booking` project root and merge the folders.
2. Add all new files listed in `UPDATE_26_FILE_GUIDE.md`.
3. Replace the existing `README.md` and `docs/implementation-roadmap.md` with the versions in this package.
4. Do not replace or regenerate any Prisma schema, migration, generated Prisma client, package manifest, lockfile, environment file, local database, or unrelated source file.

## What changes

- System Admin can issue/resend and revoke invitations for existing active employee records through two guarded API endpoints.
- An invitation is sent only to the work email stored on that Employee record. A resend invalidates the previous pending invitation.
- Invitations expire after 72 hours. The raw token is never stored; only its SHA-256 digest is stored in the existing Better Auth `Verification` table.
- The invitee creates or uses a Better Auth identity for the invited email, verifies it, signs in with that exact address, and explicitly accepts the invitation.
- Acceptance rechecks the verified User, active Employee, unchanged work email, duplicate account links, and token in one serializable transaction. It creates only `EmployeeAccount` and writes an audit event.
- Invitation viewing does not accept the invitation. Acceptance requires an explicit POST action.
- Existing employee roles are not created, modified, or inferred by this update.

## Email behavior

- Development uses the existing non-production console email transport. The invitation URL is printed in the Next.js terminal under `[MERUNO local auth email]`.
- Production uses the existing Resend configuration (`AUTH_EMAIL_MODE`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM`). No new environment variable is required.
- The invitee must verify the invited address through the existing Better Auth email-verification flow, then return to the original invitation link and sign in before accepting it.
- If email delivery fails, the just-created pending invitation token is removed and the failure is audited.

## API contracts

Issue or resend an invitation:

`POST /api/admin/employee-invitations`

```json
{
  "employeeId": "<existing employee id>",
  "reason": "Approved staff onboarding"
}
```

Revoke the pending invitation:

`POST /api/admin/employee-invitations/revoke`

```json
{
  "employeeId": "<existing employee id>",
  "reason": "Onboarding request withdrawn"
}
```

Both require the existing `employee.account.link` permission (System Admin only) and a same-origin request.

Acceptance is performed by the signed-in invitee through:

`POST /api/auth/employee-invitations/accept`

```json
{
  "employeeId": "<existing employee id>",
  "token": "<invitation token from the email link>"
}
```

The server derives the user ID from the validated Better Auth session. It does not accept a client-provided role, employee link, or user ID as proof of identity.

## Files

See `UPDATE_26_FILE_GUIDE.md` for every added and replaced path and its purpose.

## Dependencies and database

- No `npm install` is required.
- No dependency or package-script change.
- No Prisma schema change, migration, Prisma Client generation, seed, `db push`, reset, or database reconciliation.
- The existing `Verification`, `EmployeeAccount`, and `AuditLog` models are reused.
- No new environment variable is required.

## Local scenarios to verify

Use synthetic employees and email addresses only.

1. As a System Admin, issue an invitation for an active Employee with a valid `workEmail`; confirm the local email URL is printed and the expiry is 72 hours.
2. Resend for the same employee; confirm the earlier link is no longer accepted.
3. Open the link without a session; confirm the page offers controlled identity creation/sign-in and does not link the employee yet.
4. Create a sign-in identity using the exact invited address, verify the address, sign in, reopen the invitation, and explicitly accept it.
5. Confirm exactly one `EmployeeAccount` is created with `verifiedAt` set and `linkedByEmployeeId` pointing to the inviter. Confirm no Employee or EmployeeRoleAssignment is created or changed.
6. Try a different verified email, unverified identity, expired link, wrong token, reused link, already-linked employee, and employee whose status/work email changed; each must fail without partial linking.
7. Revoke a pending invitation and confirm its link becomes unavailable.
8. Try issuing/resending/revoking without System Admin permission and confirm the request is denied.

## Validation — exact order

Run these from the project root and send the complete output:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected additions: 13 unit tests and 3 E2E tests. Starting from the confirmed Update 25 baseline of 51 unit and 14 E2E tests, expected totals are **64 unit tests and 17 E2E tests**, assuming no other local test changes.

The ZIP was assembled from the saved, previously validated MERUNO update files and inspected for package contents. This environment does not contain the complete current project checkout or its installed dependencies, so typecheck, lint, E2E, and production-build results must be confirmed on the local project using the commands above.
