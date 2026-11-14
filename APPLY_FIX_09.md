# MERUNO Public Site Fix 09 — Skip Link and Services E2E Alignment

## Apply

1. Stop the Next.js development server.
2. Extract this ZIP into a temporary folder.
3. Merge the `src` and `tests` folders into the project root.
4. Replace only the two paths listed in `FILE_GUIDE.md`.
5. Restart the test commands below.

## What this fixes

- Removes the duplicate public-layout skip link. The application-level skip link remains the single keyboard-accessible entry point and still targets `#main-content`.
- Strengthens the public-site test to assert exactly one skip link and its destination.
- Aligns the Services navigation test with the actual user-facing service-area content (Specialist consultations, Laboratory services, and Digital X-ray & Ultrasound), rather than a page-intro heading string that has drifted from the rendered page.

## Safety / scope

- No route, business logic, authorization, database, Prisma schema, migration, package, or dependency changes.
- No change to public content or visual design, apart from removing the duplicate accessibility link.
- The test continues to verify the public homepage, language direction, navigation, services content, footer, mobile overflow, and health contract.
