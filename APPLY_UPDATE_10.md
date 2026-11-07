# MERUNO Update 10 — Apply Instructions

## Replaces
- `prisma/schema.prisma`
- `README.md`
- `docs/architecture.md`
- `docs/implementation-roadmap.md`

## Adds
- `docs/database/phase-2d-billing-operations.md`

## Apply
1. Extract this ZIP at the project root: `C:\Users\PC\clinic-booking\clinic-booking`.
2. Allow replacement of only the four listed files.
3. Do not replace `.env`, `.git`, `.gitignore`, `package.json`, `package-lock.json`, `prisma7.config.ts`, `node_modules`, `.next`, or `generated/prisma`.
4. Do not run `prisma migrate`, `db push`, `migrate reset`, or any database-writing command for this update.

## Verify all at once
Run the following commands in PowerShell, in this order:

```powershell
npm run db:validate
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

If any command fails, stop and share the error before continuing. These are independent commands; no extra PowerShell wrapper is required.

## Scope and safety
This update adds schema/documentation only. It does not create or apply migrations, seed data, change PostgreSQL, install dependencies, or implement user-facing workflows. `Attachment.storageKey` is an opaque private storage key, not a public URL. Role-based restrictions for discounts, refunds, incidents and audit access are enforced in the later Authorization phase.
