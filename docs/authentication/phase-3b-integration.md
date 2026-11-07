# MERUNO Phase 3B — Better Auth integration

## What this update adds

- A server-only Better Auth instance backed by the existing Prisma 7 client and PostgreSQL adapter.
- A Next.js App Router catch-all endpoint at `/api/auth/[...all]`.
- A React auth client at `src/lib/auth-client.ts`.
- A server helper that returns the validated current session or `null`.
- Validation for `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.

## Deliberate security scope

- Email/password authentication is enabled for controlled, pre-provisioned identities.
- Public sign-up is disabled (`disableSignUp: true`).
- No employee account can be created through public authentication.
- No public patient self-registration or account-to-patient linking is enabled yet.
- No email delivery provider is configured in this step. Do not enable self-registration until verification delivery and verified patient-linking flows are implemented.
- A valid Better Auth session is only an authenticated identity. It does not independently grant access to an Employee, Patient, or clinical record. Domain authorization is added in a later phase step.

## Environment variables

Keep the existing `DATABASE_URL` unchanged. Add these two variables to the existing root `.env` file; do not replace the file:

```dotenv
BETTER_AUTH_SECRET="replace-with-a-generated-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

Generate a high-entropy secret in PowerShell with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Copy the generated output into `BETTER_AUTH_SECRET`. Never commit `.env` or share the secret.

If the local Next.js server uses a different port, set `BETTER_AUTH_URL` to that exact origin. Production must use HTTPS and its production origin.

## Files

- `src/server/auth/environment.ts`
- `src/server/auth/auth.ts`
- `src/server/auth/session.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/lib/auth-client.ts`

## Existing files intentionally not changed

- `src/server/db/client.ts` — Better Auth reuses `getPrismaClient()`; no second Prisma pool is created.
- `src/server/env.ts` — the existing database environment handling remains unchanged.
- `prisma/schema.prisma` and migration history — Phase 3A already created the required auth tables.
- `prisma7.config.ts` — the existing Prisma 7 configuration remains unchanged.

## Validation

After adding the two environment variables, run the validation commands in `APPLY_UPDATE_16.md`.

Then start the development server and open:

`http://localhost:3000/api/auth/get-session`

When no one is signed in, the endpoint should return a JSON `null` session. This confirms the handler and database-backed auth configuration can be reached; it does not yet test sign-in because self-sign-up is intentionally disabled.
