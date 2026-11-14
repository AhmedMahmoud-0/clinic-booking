# MERUNO Public Site Regression Fix 12

## Apply
1. Stop the Next.js development server.
2. Extract this ZIP at the project root and merge the folders.
3. Replace only the five files listed in FILE_GUIDE.md.
4. Restart the focused checks below.

## What this corrects
- Removes the second public-layout skip link. The application root layout remains the single source of the accessible skip link, consistent with Update 73 Fix 03 / Public Site Fix 09.
- Explicitly keeps the desktop-only Sign in and Book appointment actions hidden below the `xl` breakpoint. The mobile menu continues to provide those actions. This addresses the measured 320px overflow offender in the header.
- Retains real click-based navigation tests for About, Services, and specialty cards, with a longer wait for first-time Next.js development-route compilation. It does not replace click tests with direct `page.goto` calls.
- Gives the Update 76 anonymous redirect E2E test a longer wait for the client-side redirect in the development test server. API authorization is unchanged.

## Scope
No homepage, specialty-card markup, route, business logic, database, schema, migration, dependency, or production authorization changes are included. The homepage and specialty-card links restored by Fix 11 remain untouched.
