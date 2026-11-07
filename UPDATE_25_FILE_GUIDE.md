# MERUNO Update 25 — File-by-file guide

## New server files

| File | Purpose |
| --- | --- |
| `src/server/auth/email/email-change-validation.ts` | Validates email-change inputs, generates high-entropy tokens, hashes tokens, and safely parses the pending state stored in `Verification`. |
| `src/server/auth/email/email-change.ts` | Implements request, current-address approval, final verification, collision checks, atomic synchronization, audit logging, pending-state consumption, and session revocation. |
| `src/server/auth/email/email-change-http.ts` | Centralizes same-origin validation, JSON/no-store responses, and safe error mapping for the email-change routes. |

## New API routes

| File | Purpose |
| --- | --- |
| `src/app/api/auth/email-change/request/route.ts` | Authenticated request; requires a verified session and sends approval to the current address. |
| `src/app/api/auth/email-change/approve-current/route.ts` | Validates the current-address token, consumes it, and sends verification to the new address. |
| `src/app/api/auth/email-change/complete/route.ts` | Validates the new-address token and commits all identity/contact changes in one serializable transaction. |

## New UI files

| File | Purpose |
| --- | --- |
| `src/components/auth/account-email-change-form.tsx` | Adds the new-address request form to account security while displaying the existing address as read-only. |
| `src/components/auth/email-change-confirmation-form.tsx` | Requires an explicit user click to approve the current address or verify the new address; displays completion states. |
| `src/app/auth/email-change/page.tsx` | Renders the confirmation screen and success states. Token-bearing pages are excluded from indexing. |

## Existing files replaced

| File | What changed |
| --- | --- |
| `src/server/auth/email/email-content.ts` | Adds two escaped email templates: current-address approval and new-address verification. Existing registration/reset templates are preserved. |
| `src/app/auth/account-security/page.tsx` | Adds the email-change form to the existing authenticated account-security screen. |
| `README.md` | Marks Phase 3G-A complete and Update 25 / Phase 3G-B1 current. |
| `docs/implementation-roadmap.md` | Records the user's confirmed Phase 3F and 3G-A completion and splits Phase 3G-B1 from future employee invitation work. |

## Tests added

- `tests/unit/email-change-validation.test.ts`: 10 tests for normalization, token generation and hashing, token verification, serialized-state parsing, and verification identifiers.
- `tests/e2e/email-change.spec.ts`: 3 checks for invalid/incomplete links and explicit confirmation behavior.

## No other files changed

- No `package.json` or lockfile changes.
- No Prisma schema, migration, or generated-client changes.
- No new environment variables.
- Existing `src/components/auth/account-security-form.tsx` remains unchanged and continues to handle password changes.
