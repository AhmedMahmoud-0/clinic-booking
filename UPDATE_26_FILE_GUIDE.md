# MERUNO Update 26 — File-by-file guide

This update adds controlled employee invitations to Phase 3G-B2. It builds on the existing Better Auth session, System Admin permission, employee-account link, email transport, `Verification` table, and audit log.

## Added files

| Path | Purpose |
| --- | --- |
| `src/server/auth/invitations/employee-invitation-validation.ts` | Defines Zod request shapes, invitation-state parsing/serialization, 256-bit token generation, SHA-256 hashing, constant-time token comparison, and the employee-scoped `Verification.identifier`. |
| `src/server/auth/invitations/employee-invitation.ts` | Implements issue/resend, preview, revoke, and accept services. Enforces active employee/work-email matching, verified identity, duplicate-link checks, 72-hour expiry, serializable transactions, and audit writes. |
| `src/server/auth/email/employee-invitation-content.ts` | Builds text and escaped HTML invitation email using the existing email-content helper and brand treatment. |
| `src/app/api/admin/employee-invitations/route.ts` | System Admin-only endpoint to issue or resend an invitation for an existing Employee. |
| `src/app/api/admin/employee-invitations/revoke/route.ts` | System Admin-only endpoint to revoke a pending invitation. |
| `src/app/api/auth/employee-invitations/accept/route.ts` | Signed-in invitee endpoint; obtains the user ID from the Better Auth session and accepts the invitation after server-side verification. |
| `src/app/auth/employee-invitation/page.tsx` | Read-only invitation preview page; branches between identity setup, sign-in guidance, and explicit acceptance. |
| `src/components/auth/employee-invitation-registration-form.tsx` | Creates a basic Better Auth identity for the invitation's fixed email; requires email verification before the employee link can be accepted. |
| `src/components/auth/employee-invitation-accept-form.tsx` | Provides the explicit POST action that accepts a verified invitation and refreshes account status. |
| `tests/unit/employee-invitation-validation.test.ts` | Covers token generation, hashing, normalization, persisted-state validation, identifiers, and request validation. |
| `tests/unit/employee-invitation-email-content.test.ts` | Covers invitation URL, expiry wording, and HTML escaping. |
| `tests/e2e/employee-invitation.spec.ts` | Covers invalid invitation entry and anonymous access denial for issue/accept endpoints. |

## Replaced files

| Path | Purpose |
| --- | --- |
| `README.md` | Updates the project status: Update 25 + Fix 01 are complete; Update 26 / Phase 3G-B2 is the current implementation awaiting local validation. |
| `docs/implementation-roadmap.md` | Closes 3G-B1 based on the developer's successful checks and records the detailed 3G-B2 scope and current validation status. |

## Important boundaries

- Only `employee.account.link` permission can issue or revoke invitations; the existing permission matrix grants it to System Admin only.
- The invitation targets the stored work email of an existing active employee. The recipient cannot change that email inside the invitation flow.
- The raw token is not stored or returned by the admin API. Only its digest is stored in the existing `Verification` table.
- Acceptance creates only `EmployeeAccount`; role assignments are not granted, changed, or inferred.
- The admin workspace UI is not part of this update; the new server endpoints are available for the later Phase 11 System Admin workspace.
- No existing file under `prisma/`, `generated/prisma/`, `package.json`, or `package-lock.json` is replaced.
