# MERUNO Phase 3G-B1 — Verified Email Change (Update 25)

## Scope

This sub-update implements only self-service email change for an already authenticated, email-verified Better Auth identity. Employee invitations, identity-link administration, and patient delegation remain separate future work.

## User flow

1. The signed-in user enters a new address in `/auth/account-security`.
2. MERUNO checks that the address is not already used by another Better Auth user, employee work email, or patient email contact. A pending request is stored in the existing Better Auth `Verification` table with a SHA-256 token digest.
3. A confirmation link is sent to the current address. Opening the page does not execute the change; the user must press **Approve email change**. The link expires after 15 minutes.
4. MERUNO sends a separate verification link to the new address. The user must press **Verify new email address**. This link expires after one hour.
5. Only after both steps succeed does one serializable Prisma transaction update `User.email`, any linked `Employee.workEmail`, and the linked patient's `PatientContact` email. The transaction rechecks conflicts, writes a minimal audit event, consumes the pending verification, and revokes all active sessions.
6. The user signs in again using the new address.

## Data integrity and security

- The account's current email is not changed when the request is created or when the current address is approved. It changes only after the new address is verified.
- The request is bound to the account ID and the current email value. Tokens are random, URL-safe, stored as SHA-256 digests, single-use, and expire.
- Current-address and new-address links use an explicit POST confirmation. A GET request or email-link scanner cannot complete either step.
- Final conflict checks cover `User.email`, `Employee.workEmail`, and `PatientContact.normalizedValue` for `EMAIL` contacts.
- If the account has an `EmployeeAccount`, its `Employee.workEmail` must still match the current sign-in email or the transaction is rejected for administrative reconciliation.
- If the account has a `PatientAccount`, the patient's existing email contact is updated, or a verified contact is created if the old one is absent. An existing new address on the same patient is reconciled without creating a duplicate.
- The `User`, linked employee/patient contact, audit event, pending verification, and session revocation are committed atomically. A transaction conflict or domain-sync mismatch does not partially change the account.
- Audit metadata does not store either email address or any token. The event is `USER_EMAIL_CHANGED` with actor type `EXTERNAL`, because the current audit schema does not link a patient account directly to `AuditLog`.
- A successful change deletes all Better Auth session records; the user must sign in again.

## Implementation notes

Better Auth has a built-in email-change option. This project uses a MERUNO-owned two-step confirmation workflow because the sign-in identity must be synchronized with clinic-domain email fields in the same database transaction. The existing `Verification` model is reused, so this update does not change Prisma schema or migration history.

Email delivery continues through the existing `sendAuthEmail` helper. Local non-production development uses the existing console transport; production requires the existing Resend configuration. No email token should be shared in screenshots, logs, or source control.

## Explicitly not included

- Employee invitations or employee creation.
- Patient/employee account linking or unlinking changes.
- Guardian/adult delegation and grant-management operations.
- Updating unrelated patient contact records or employee records that are not linked to the current Better Auth user.
- Any database schema change, migration, dependency, or environment variable change.

## Local manual test

Use synthetic identities only. Test one patient-linked account, one employee-linked account, and one unlinked account if available. Verify both confirmation emails, the no-change-before-final-verification behavior, duplicate-address rejection, synchronization of linked contact fields, and forced re-login after success.
