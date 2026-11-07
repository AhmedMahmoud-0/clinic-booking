# MERUNO Update 15 — Phase 3A merged authentication schema

## What this update contains

This package contains the complete merged `prisma/schema.prisma` file. It is based on the latest Phase 2D schema distributed with Update 12 and merges the Phase 3A authentication fragment from Update 14.

It includes:
- Better Auth core models: `User`, `Session`, `Account`, `Verification`.
- Explicit employee and patient account links.
- Employee role assignments.
- Patient access grants and scoped permissions.
- Four new enums and all inverse relation fields required by the new models.

## Apply

1. Keep a backup copy of your current `prisma/schema.prisma` outside the project folder.
2. Replace only `prisma/schema.prisma` with the file in this package.
3. Do not replace `.env`, `prisma7.config.ts`, `generated/prisma`, `node_modules`, `.git`, or any database files.
4. From the project root, run:

```powershell
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
```

5. Do not run a migration until these checks pass and the user has reviewed the output.

## Important

This is a schema replacement file, not a migration. It does not execute SQL or modify the PostgreSQL database. After validation, create a new incremental migration for the authentication additions; do not regenerate or replace the already-applied initial migration.
