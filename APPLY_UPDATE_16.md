# Apply MERUNO Update 16 — Phase 3B

## 1. Copy files

Copy the `src` and `docs` folders from this update into the project root, merging folders when prompted. These are five new files. Do not replace existing folders wholesale.

## 2. Add environment variables

Keep `DATABASE_URL` and all existing values in `.env`. Add:

```dotenv
BETTER_AUTH_SECRET="replace-with-a-generated-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

Generate the secret from PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Paste the generated value locally into `.env`. Do not send it in chat or commit it.

## 3. Run checks

Run from the project root:

```powershell
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

No new dependency installation or database migration is required for this update. Better Auth and its Prisma adapter were installed in Update 14, and the auth tables were created in Update 15/Phase 3A.

## 4. Smoke-test the auth route

Start the app:

```powershell
npm run dev
```

Open `http://localhost:3000/api/auth/get-session`. With no authenticated browser session, expect a JSON `null` session. Stop the dev server with `Ctrl+C` after checking.

## Important

- Public sign-up remains disabled intentionally.
- Do not run `prisma migrate dev`, `db push`, `migrate reset`, or the initial migration preview for this update; it changes application code and environment configuration only.
- Do not alter or share `.env` values other than confirming that the two required keys exist.
