# Apply MERUNO — Authentication UI and workspace routing

1. Stop the local Next.js development server.
2. Make a backup of the current project folder.
3. Extract this ZIP into the existing `clinic-booking` project root.
4. Merge the included `src`, `tests`, and `docs` folders into the matching folders.
5. Replace the listed files when prompted. Do not delete unrelated files.

## Files to replace

- `src/app/login/login.module.css`
- `src/app/auth/account-status/page.tsx`
- `tests/e2e/auth-entry.spec.ts`

## Files to add

- `src/server/auth/authorization/post-sign-in-destination.ts`
- `tests/unit/post-sign-in-destination.test.ts`
- `docs/authentication/auth-ui-and-workspace-entry.md`

## Protected files

Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, or `prisma7.config.ts`.

## Database and dependencies

No migration, seed, database write, package installation, or dependency change is required.
