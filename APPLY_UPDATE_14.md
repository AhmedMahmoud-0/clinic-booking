# Apply MERUNO Update 14 — Phase 3A Auth Foundation

## Files in this update

- `package.json` — adds Better Auth and its Prisma adapter at matching stable versions.
- `prisma/phase-3a-auth-schema-fragment.prisma` — schema additions to merge into the existing schema; this is intentionally a fragment, not a replacement `schema.prisma`.
- `docs/authentication/phase-3a-schema-placement.md` — exact insertion instructions and security rules.

## Before editing

Make a local copy of `prisma/schema.prisma`. Do not change `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, the existing migrations, or the local database manually.

## Apply

1. Replace `package.json` with the supplied file.
2. Merge the enums, inverse relation fields, and model declarations from the Prisma fragment using `docs/authentication/phase-3a-schema-placement.md`.
3. Keep your existing `package-lock.json`; the install command below will update it.
4. In PowerShell, from the project root, run:

```powershell
npm install
npm run db:validate
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

5. Only after all validation/test commands pass, create and apply the incremental migration to the local development database:

```powershell
npx prisma migrate dev --name add_authentication_foundation --config=./prisma7.config.ts
```

## Do not run

- `npm run db:migration:preview` — this is the initial-schema preview tool and must not overwrite the already applied initial migration.
- `npx prisma db push`
- `npx prisma migrate reset`
- `npm run db:seed` — no new auth seed is included in this update.

## Scope boundary

This update adds Better Auth's database dependency and the authentication/authorization schema only. It does not yet expose sign-up/sign-in endpoints, enable public registration, configure email delivery, create the auth route, or assign the first system administrator. Those tasks are implemented only after the schema and package tests pass and the current Prisma client/env files are checked.

The dependency versions are pinned to Better Auth `1.7.18` and its Prisma adapter `1.7.18` so the independently released packages stay aligned. Better Auth's 1.7.16 security release fixed multiple security advisories; use a release newer than that fixed baseline.
