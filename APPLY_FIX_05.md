# MERUNO Authentication UI Fix 05 — Brand Panel Style Override

## Purpose

Fixes the remaining Playwright failure in `auth-entry.spec.ts`, where the Login brand panel computed `display: block` despite its Tailwind `flex` class. The panel now explicitly sets its flex layout, teal gradient, and white text through inline presentation styles so broad global `section` rules cannot override the intended panel layout.

## Apply

1. Stop the Next.js development server.
2. Extract this ZIP into the project root.
3. Replace `src/components/auth/auth-page-layout.tsx`.
4. Restart the development server before browser testing.

No auth behavior, routing, permissions, Prisma schema, database, dependencies, or global styles are changed.
