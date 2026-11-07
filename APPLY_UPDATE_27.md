# Apply Update 27 — Phase 3G-C Patient Delegation Management

## Apply target

Apply this package over the locally verified MERUNO project after Update 26 and Fixes 01, 02, and 03. The developer confirmed the current baseline passed all five checks with 64 unit tests and 17 E2E tests.

Extract the ZIP into the existing project root and allow the listed replacement files to overwrite their existing counterparts. Do not replace unrelated files.

## Files to add

```text
src/server/auth/delegation/patient-delegation-validation.ts
src/server/auth/delegation/patient-delegation.ts
src/app/api/clinic/patient-delegations/route.ts
src/app/api/clinic/patient-delegations/[grantId]/route.ts
src/app/api/clinic/patient-delegations/[grantId]/revoke/route.ts
src/app/api/patient/delegations/route.ts
src/app/api/patient/delegations/[grantId]/decision/route.ts
src/app/api/patient/delegations/[grantId]/revoke/route.ts
tests/unit/patient-delegation-validation.test.ts
tests/unit/patient-delegation-age.test.ts
tests/e2e/patient-delegation.spec.ts
docs/authentication/phase-3g-c-patient-delegation-management.md
```

## Files to replace

```text
src/server/auth/authorization/types.ts
src/server/auth/authorization/policy.ts
src/server/auth/authorization/delegation-policy.ts
tests/unit/authorization-policy.test.ts
README.md
docs/implementation-roadmap.md
```

The authorization test replacement preserves the existing Phase 3E policy suite and adds coverage for the new permission. The permission/policy replacements preserve existing roles, workspaces, scopes, and authorization behavior while adding one dedicated grant-management permission.

## What the update implements

- `patient.delegation.manage` is granted only to Reception and System Admin.
- Staff can list a subject patient's grants, create/reissue a grant for an existing directed relationship, replace exact scopes/expiry, and revoke a pending or active grant.
- The grantee must have an active verified PatientAccount. An adult subject must also have an active verified PatientAccount.
- Minor grants activate only when legal-guardian metadata is already verified by an employee. Adult grants remain pending until the authenticated subject patient explicitly approves them.
- Staff edits to an adult grant's scopes or expiry clear the former approval and make the grant pending again.
- The subject patient can view outgoing/incoming grants, approve/reject adult requests, and revoke their own outgoing grants.
- Every lifecycle operation is audited; existing Phase 3E exact-scope access checks remain the final record-access boundary.

## Do not change

Do not modify or replace:

- `.env` or any secret values.
- `.git`, `node_modules`, `.next`, generated Prisma output, or lockfiles.
- `package.json` or `package-lock.json`.
- `prisma/schema.prisma` or `prisma/migrations`.
- The local PostgreSQL database or migration history.
- Existing account-linking, sign-in, email-change, or employee-invitation files.

## Database and dependency impact

No Prisma schema change, migration, seed, `prisma generate`, `db push`, migration reset, database write, new dependency, environment variable, or package script is required. The update reuses the existing Phase 3A grant, relationship, account, and audit models.

## Validation commands

Run in the exact order below and send the complete output if any command fails:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected test totals after a clean apply:

- Unit: 86 passed across 11 files.
- E2E: 22 passed.

The previous baseline was 64 unit and 17 E2E tests. These totals are expectations, not a claim that the local project has already passed.

## Important UI note

The update adds the secured API layer, not management screens. Patient portal UI is scheduled for Phase 10; Reception/System Admin grant-management UI is scheduled for Phase 11. Do not write grant records directly from browser code; call the protected Route Handlers.
