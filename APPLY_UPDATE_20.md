# MERUNO Update 20 — Playwright Auth Test Selector Fix

## What this fixes

The login E2E test used `getByLabel("Password")`. That locator matched both the password input and its adjacent visibility-toggle button (`aria-label="Show password"`), causing a Playwright strict-mode violation. The application control itself is not failing; the test selector is ambiguous.

The test now targets the actual input with `getByRole("textbox", { name: "Password" })`.

## Apply

Replace this one file only:

```text
tests/e2e/auth-entry.spec.ts
```

Do not replace application source files, `.env`, migrations, or the database.

## Verify

Run:

```powershell
npm run test:e2e
```

Expected result: 6 tests pass. No migration, package installation, or database changes are required.
