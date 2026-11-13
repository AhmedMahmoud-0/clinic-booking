# MERUNO — Authentication UI Fix 03

## What this update fixes

This package completes the visual work that was missing from the previous authentication UI package:

- Rebuilds the Login and Register page presentation with the existing Tailwind CSS 4 utility system used by the public website.
- Uses one shared responsive MERUNO authentication layout for Login, Register, password recovery, and reset flows.
- Styles the sign-in and patient-registration forms, input states, password visibility controls, validation messages, loading states, and confirmation state.
- Restyles the account-status, account-security, and email-verification screens without changing their authorization behavior.
- Changes the public-site navigation label from **Patient portal** to **Sign in** on desktop and mobile. The link still opens `/login`.
- Preserves the existing Better Auth calls, email verification, patient-only public registration, account identity boundaries, and server-side post-sign-in workspace routing.
- Adds browser assertions that verify the brand panel actually receives its visual styles, the registration view is present, and the public header says Sign in.

## Apply

1. Stop the current Next.js development server.
2. Extract this ZIP into the existing `clinic-booking` project root.
3. Merge the included `src` and `tests` folders into the matching project folders.
4. Replace only the matching files listed in `FILE_GUIDE.md`.
5. Do not replace unrelated files.
6. Restart the development server after the files are copied. Do not keep an older `next dev` process running on port 3000.

## Files that must remain untouched

Do not replace or modify `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, or the local PostgreSQL database.

## Database and dependencies

- No Prisma schema changes.
- No migrations, seed, database writes, or reset.
- No new npm dependency.
- No `npm install` required.

## Verification

Run from the project root:

```bash
npm run typecheck
npm run lint
npx vitest run tests/unit/post-sign-in-destination.test.ts
npx playwright test tests/e2e/auth-entry.spec.ts tests/e2e/auth-lifecycle.spec.ts --workers=1 --reporter=list
npm run build
```

Then manually open `/login`, `/register`, and `/` at desktop width and narrow mobile width. Confirm that Login and Register show the teal MERUNO brand panel and styled form card, and that the public header link reads **Sign in**. Finally sign in with the existing System Admin account and confirm that the browser reaches `/system-admin`.
