# MERUNO Update 24 — File-by-file guide

## New server files

| File | Purpose |
| --- | --- |
| `src/server/auth/email/email-content.ts` | Builds escaped HTML and plain-text templates for verification and password-reset messages. |
| `src/server/auth/email/email-delivery.ts` | Provides a local-only console transport and a dependency-free Resend HTTP transport; production availability is checked before public sign-up is enabled. |

## Server file replaced

| File | What changed |
| --- | --- |
| `src/server/auth/auth.ts` | Enables sign-up only when email delivery is available, requires email verification before session creation, and configures password-reset delivery and session revocation. |

## New UI files

| File | Purpose |
| --- | --- |
| `src/components/auth/auth-page-layout.tsx` | Reuses the existing MERUNO authentication layout for lifecycle pages. |
| `src/components/auth/sign-up-form.tsx` | Patient sign-in registration and generic post-submit response/resend control. |
| `src/components/auth/forgot-password-form.tsx` | Requests a password reset without disclosing whether an email is registered. |
| `src/components/auth/reset-password-form.tsx` | Validates reset-token presence and submits the new password. |
| `src/components/auth/account-security-form.tsx` | Changes password using the current password and revokes other sessions. |
| `src/app/register/page.tsx` | Patient account registration page. |
| `src/app/forgot-password/page.tsx` | Password recovery request page. |
| `src/app/reset-password/page.tsx` | Password reset page opened from an emailed link. |
| `src/app/auth/verification-complete/page.tsx` | Email verification success/error destination. |
| `src/app/auth/account-security/page.tsx` | Authenticated password-security page. |

## Existing files replaced

| File | What changed |
| --- | --- |
| `src/app/login/page.tsx` | Adds registration and password-recovery entry links while retaining the existing sign-in form and MERUNO visual language. |
| `tests/e2e/auth-entry.spec.ts` | Updates the login-page assertion to expect the new patient registration and forgot-password links. |
| `README.md` | Marks Phase 3F complete and Phase 3G-A current. |
| `docs/implementation-roadmap.md` | Splits Phase 3G into 3G-A, 3G-B, and 3G-C and records the new scope. |

## Tests

- `tests/unit/auth-email-content.test.ts`: 6 pure tests for email content, escaping, expiry text, and link rendering.
- `tests/e2e/auth-lifecycle.spec.ts`: 5 browser checks for registration, mobile overflow, forgot password, missing/expired reset token state, and anonymous account-security redirect.
- `tests/e2e/auth-entry.spec.ts`: preserves the 3 existing entry tests while updating the expected links.

Expected totals, assuming the previous 35 Unit and 6 E2E tests are unchanged:

- Unit: 41 passing.
- E2E: 11 passing.

## Security invariants

- Email verification is mandatory before a user can receive a Better Auth session.
- No public registration code writes a Patient, Employee, PatientAccount, EmployeeAccount, EmployeeRoleAssignment, or PatientAccessGrant row.
- A verified email is not proof of clinic patient identity.
- Patient-record access remains blocked until the existing authorized two-identifier account-linking workflow is completed.
- Public registration never creates employee roles.
- Password reset invalidates other sessions.
- Email change is deferred until clinic contact/work-email synchronization and collision checks are designed.
- Console email delivery is non-production only.
