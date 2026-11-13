# Apply MERUNO Authentication UI Fix 02

1. Stop the local Next.js server.
2. Extract this ZIP into the existing `clinic-booking` project root.
3. Replace only the two files listed below.

## Files to replace

- `tests/unit/post-sign-in-destination.test.ts` — changes the two imports to project-relative paths so Vitest resolves them without relying on the Next.js `@/*` alias.
- `tests/e2e/auth-entry.spec.ts` — targets the password input by its textbox role and accessible name, avoiding a strict-mode match with the adjacent Show/Hide password button.

No application source, authorization policy, routes, database schema, migrations, package files, dependencies, or environment variables are changed.
