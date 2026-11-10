# MERUNO Update 35 — File-by-file guide

## Prisma and migration

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Adds PatientAddress, PatientEmergencyContact, PatientConsent, consent enums, and soft-active state on PatientContact; adds Patient/Employee relations. |
| `prisma/migrations/20261108030000_patient_contacts_and_consents/migration.sql` | Sixth additive migration; creates the new patient profile/consent tables, partial unique primary indexes, restrictive foreign keys, verified-guardian validation, and append-only consent trigger. |

## Server-side modules

| File | Purpose |
|---|---|
| `patient-contact-consent-validation.ts` | Strict Zod commands for contacts, addresses, emergency contacts, and consent events. |
| `patient-consent-policy.ts` | Pure age/signer/withdrawal policy; uses clinic-local date passed by the server. |
| `patient-contact-profile.ts` | Reads and mutates the patient contact profile using serializable transactions; contact/address/emergency history is deactivated rather than deleted. |
| `patient-consents.ts` | Reads consent timeline/current decisions and appends new events after validating patient/guardian signer. |
| `patient-contact-consent-errors.ts` | Domain errors with stable status/code values. |
| `patient-contact-consent-http.ts` | Maps domain/Prisma errors to safe no-store responses using the existing patient-management HTTP helpers. |
| contact-profile Route Handler | GET requires `patient.contact.read` (Reception only); POST requires `patient.contact.manage` (Reception only). |
| consents Route Handler | GET requires `patient.consent.read` (Reception and Doctor); POST requires `patient.consent.record` (Reception and Doctor). No edit/delete routes exist. |

## Authorization

`types.ts` adds scoped read/manage/record permissions. `policy.ts` grants contact read/manage to Reception only and consent read/record to Reception and Doctor. It does not grant patient-record access to Clinic Manager or System Admin.

## Tests

- `patient-contact-consent-validation.test.ts`: 28 validation tests across contact-profile and consent-event commands.
- `patient-consent-policy.test.ts`: 14 policy tests (age boundary, adult self-signing, verified guardian requirement, and withdrawal rules).
- `patient-contact-consent-permission.test.ts`: 6 permission tests for scoped read/manage/record access.
- `patient-contact-consent-migration.test.ts`: 7 migration contract tests.
- `patient-contact-consent.spec.ts`: 4 unauthenticated/protected API checks.

Expected delta: +55 Unit and +4 E2E; after update the total is 259 Unit and 33 E2E.
