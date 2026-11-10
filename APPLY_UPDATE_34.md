# APPLY UPDATE 34 — Phase 5B Patient Identity Verification

## Apply

1. Confirm the current project includes the locally verified Update 33 + Fix 01 state (185 unit tests and 28 E2E tests, with all five checks passing).
2. Make a backup or commit the current working tree.
3. Extract this ZIP over the existing project root and merge the folders.
4. Add the new patient identity-verification service, validation, route, tests, and documentation files.
5. Replace only `src/server/auth/authorization/types.ts`, `src/server/auth/authorization/policy.ts`, `README.md`, and `docs/implementation-roadmap.md` with the versions in this update.
6. Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, or `prisma7.config.ts`.

## What this update changes

- Adds `patient.identity.verify` as an operation-specific employee permission.
- Grants it to Reception, Doctor, Nurse, Lab Staff, Radiology Staff, Radiologist, and Cashier only. Clinic Manager and System Admin do not receive it.
- Adds a protected API for comparing two distinct identifiers against one existing active patient.
- Supports only `FULL_NAME`, `DATE_OF_BIRTH`, `PHONE`, and `MRN`, because those are represented in the current patient schema.
- Records both successful and failed checks in `IdentityVerification` and `AuditLog` without storing submitted identifier values.

## Database and dependencies

- No Prisma schema change.
- No migration; migration count must remain unchanged.
- No `npm run db:generate`, `db:seed`, `db push`, `migrate reset`, or database status change is required.
- No dependency installation or environment variable change is required.
- Existing patient records and contacts are not rewritten.

## Verification — exact order

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the prior verified baseline remains unchanged:

- Unit: 204 passing (185 previous + 17 identity comparison/validation + 2 permission tests).
- E2E: 29 passing (28 previous + 1 anonymous-access boundary test).
- Typecheck, lint, and production build pass.

The E2E test validates the unauthenticated boundary. A synthetic authorized staff account should be used in the later integrated workflow tests; do not use real patient data.

## Security and privacy invariants

- Never accept an employee ID, role, or permission from the request body. The actor comes from the current verified employee session.
- Two distinct identifier types must both match the same active patient. A phone number alone is never sufficient.
- The response does not reveal which identifier failed.
- National ID, passport, email, and free-form `OTHER` are not accepted as comparison identifiers because the current Patient schema does not store them as identity fields.
- Submitted values are used only for the comparison and are never written to `IdentityVerification`, `AuditLog`, error details, or response DTOs.
- Failed attempts are retained with result and element types for audit, using fixed reason text only.
- Appointment association/check-in, lab sample checks, and radiology exam checks are deferred to their workflow phases.
