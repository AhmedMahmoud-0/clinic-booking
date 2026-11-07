# Apply MERUNO Update 24 — Phase 3G-A

## What this update does

This update starts the account-lifecycle phase with patient sign-in registration and verified email delivery. It also adds password recovery and authenticated password changes.

**Important:** a public registration creates only a Better Auth sign-in identity. It does not create a clinic patient, employee, employee role, or medical record. The verified identity still needs to be linked to an existing Patient by Reception/System Admin using the Phase 3D two-identifier workflow before patient data can be accessed.

## 1. Back up and copy

1. Make a copy of the current project folder or commit the verified Update 23 state.
2. Extract this ZIP into the existing project root (`clinic-booking`).
3. Merge folders when Windows asks.
4. Add the new files and replace only these existing files:
   - `src/server/auth/auth.ts`
   - `src/app/login/page.tsx`
   - `tests/e2e/auth-entry.spec.ts`
   - `README.md`
   - `docs/implementation-roadmap.md`

Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, or the local PostgreSQL database.

## 2. Local email testing

No environment change is required for local development. When `AUTH_EMAIL_MODE` is not set and `NODE_ENV` is not production, the email transport defaults to `console`.

After registering or requesting a password reset, look in the terminal running the Next.js dev server for a block beginning with:

`[MERUNO local auth email]`

Open the URL printed in that local-only message to complete email verification or password reset. Do not copy these token links into a public log, repository, screenshot, or shared chat.

## 3. Production email configuration

Production public registration remains disabled until a real transactional sender is configured. Add these values to the deployment environment (do not replace or upload your `.env` file):

```dotenv
AUTH_EMAIL_MODE="resend"
RESEND_API_KEY="<your-resend-api-key>"
AUTH_EMAIL_FROM="MERUNO Medical Clinics <no-reply@your-verified-domain.example>"
```

Replace the placeholders with your actual Resend key and a sender address on a domain verified with Resend. Never commit or share the API key. Keep `AUTH_EMAIL_MODE="console"` out of production; the application rejects console email delivery when `NODE_ENV=production`.

Email change is not included in this step. It remains deferred until the new address can be safely synchronized with patient and employee contact records.

## 4. Dependencies and database

- No `npm install` is required.
- No new dependency or package script is added.
- No Prisma schema change, client generation, migration, seed, `db push`, reset, or database write is required by this update.

## 5. Run validation

Run from the project root in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected totals, assuming the current test suite has not been changed locally:

- Vitest: 41 tests across 6 files.
- Playwright: 11 tests across the E2E specs.
- TypeScript, ESLint, and production build: pass.

## 6. Manual local smoke test

1. Start the local HTTPS development server using the same command/configuration already used for Better Auth.
2. Open `/register` and create a synthetic test identity using an email address you control.
3. Confirm no login session is created before email verification.
4. Open the verification link from the local terminal output and confirm the browser reaches `/auth/verification-complete`.
5. Sign in at `/login`.
6. Open `/auth/account-security`, test a password change, then request a password reset from `/forgot-password` and use its local terminal link.
7. Confirm the account status still says the Patient record is not linked until the existing Phase 3D employee-assisted linking operation has completed.

Do not use real patient information. This is a portfolio/demo workflow only.
