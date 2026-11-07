# MERUNO Update 18 — Phase 3C: Sign-in, Sign-out, and Initial Admin Bootstrap

## Scope

This update adds the first usable sign-in flow and a one-time local-only bootstrap for the first System Admin. Public sign-up remains disabled. It does not add password reset or patient self-registration because email delivery and patient identity-linking are separate follow-up work.

## 1. Copy the files

Merge the update into the project root. Add the new files; do not replace existing folders wholesale.

New application files:

- `src/app/login/page.tsx`
- `src/app/login/login.module.css`
- `src/components/auth/sign-in-form.tsx`
- `src/components/auth/sign-out-button.tsx`
- `src/app/auth/account-status/page.tsx`

New local bootstrap files:

- `scripts/bootstrap-system-admin.mjs`
- `scripts/bootstrap-system-admin.ps1`

New test:

- `tests/e2e/auth-entry.spec.ts`

No package installation, Prisma schema edit, or database migration is required.

## 2. Run checks

From the project root:

```powershell
node --check .\scripts\bootstrap-system-admin.mjs
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

## 3. Create the first System Admin locally

Run this from the project root in PowerShell:

```powershell
.\scripts\bootstrap-system-admin.ps1
```

The script prompts for:

- Administrator work email
- First and last name
- Employee number, e.g. `MER-ADMIN-001`
- Confirmation that you control the work email (type `YES`)
- Initial password (entered as a hidden SecureString; minimum 12 characters)

Safety properties:

- The script refuses to run unless `DATABASE_URL` points to local PostgreSQL (`localhost`, `127.0.0.1`, or `::1`).
- It refuses to run if any `SYSTEM_ADMIN` assignment already exists. This is a one-time bootstrap, not a general account-creation command.
- It creates the Employee, Better Auth User, credential Account, EmployeeAccount link, `SYSTEM_ADMIN` role assignment, and corresponding AuditLog entry in one PostgreSQL transaction.
- The initial account's email is marked verified based on the local operator's explicit attestation that they control that mailbox. Use only an address you control. This is a one-time bootstrap trust decision; it does not verify any other account or turn on public registration.
- The password is hashed with Better Auth's own `hashPassword` utility. It is not written to source files or printed to the terminal.
- The PowerShell wrapper removes the temporary bootstrap environment variables and clears the SecureString buffer after execution.

Do not run this against a production database. It is restricted to local PostgreSQL by design.

## 4. Test sign-in

Start the development server using the same HTTPS local setup already configured for this project. With `BETTER_AUTH_URL="https://localhost:3000"`, the local Next.js server must also serve HTTPS. If the `dev` script is still `next dev`, run:

```powershell
npm run dev -- --experimental-https
```

Open:

`https://localhost:3000/login`

Sign in using the email and password entered during the bootstrap. The app should open `/auth/account-status` and show the active `System administrator` role.

The account-status page only confirms authentication and linked identity status. It does not yet unlock protected workspaces or patient records; server-side authorization is the next phase step.

## 5. Preserve existing project state

Do not replace or delete:

- `.env`
- `.git`
- `node_modules`
- `.next`
- `generated/prisma`
- `prisma/schema.prisma`
- `prisma/migrations`
- Local PostgreSQL data

Do not run `db:seed`, `db:push`, `migrate reset`, or another migration for this update.
