# Apply MERUNO Update 22 — Phase 3E Authorization Core

## What this update does

This update adds the shared server-side authorization foundation for the next clinic workflows:

1. Resolves the Better Auth session to verified, active Employee and/or Patient identities from the database.
2. Defines the least-privilege employee role-to-permission matrix.
3. Adds server guards for active employee role/permission and verified patient identity.
4. Adds self/delegated patient-record scope checks, including the approved minor-guardian and adult-consent rules.
5. Changes the two existing account-linking endpoints to use the shared permission matrix instead of separate hard-coded role lists.

It does not create any new Prisma models or database records.

## Files to add

- `src/server/auth/authorization/types.ts`
- `src/server/auth/authorization/policy.ts`
- `src/server/auth/authorization/delegation-policy.ts`
- `src/server/auth/authorization/errors.ts`
- `src/server/auth/authorization/actor.ts`
- `src/server/auth/authorization/patient-access.ts`
- `src/server/auth/authorization/index.ts`
- `tests/unit/authorization-policy.test.ts`
- `docs/authentication/phase-3e-authorization-core.md`

## Files to replace

- `src/server/auth/account-linking/common.ts`
- `src/app/api/admin/account-links/employee/route.ts`
- `src/app/api/reception/account-links/patient/route.ts`
- `docs/implementation-roadmap.md`
- `README.md`

## Apply

1. Make a copy of the current project folder or commit your current working state before replacing files.
2. Extract this ZIP into the existing project root and merge the folders.
3. Add the new files at the exact paths listed above.
4. Replace only the five existing files listed above when Windows asks.
5. Do not replace `.env`, `.git`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, `generated/prisma`, or the local PostgreSQL database.

## Dependencies and database

- No `npm install` is required; no dependency changed.
- No Prisma generation is required; the existing Phase 3A schema already contains the required models.
- No migration, seed, `db push`, reset, or database write is required.

## Verification

Run from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The new unit test file contains 13 policy tests. Since the developer last reported 11 passing unit tests after Update 21, the expected total after this update is 24 passing unit tests across four test files, assuming no local tests were added or removed.

Playwright starts its own HTTPS Next.js server. Do not start another `npm run dev` process on the configured Playwright port while `npm run test:e2e` is running. If Playwright reports that a Next.js server is already running, stop that existing process and retry.

## Important security notes

- Never accept a role, Employee ID, Patient ID, or permission from client input as proof of access.
- `getCurrentAuthActor()` resolves links and roles from the database using the authenticated session.
- System Admin deliberately has no clinical-record permission in the new matrix.
- Clinic Manager deliberately has no technical System Admin permission.
- A patient relationship does not automatically grant access. A delegated grant must be active, verified, unexpired, unrevoked, and contain the exact requested scope.
- Minor access requires verified legal-guardian relationship metadata. Adult delegation requires approval by the subject patient.
- These helpers do not replace doctor assignment, resource ownership, record-state, approval, or separation-of-duties checks inside each future domain service.

After the tests pass, Phase 3E can be marked complete. The next stage is Phase 3F: protected route/workspace policies and authenticated domain data-access integration.
