# MERUNO Update 74 — Fix 01

This patch addresses the remaining focused public-site E2E failures without changing the tests, booking endpoints, database schema, or business rules.

## Changes

1. `src/components/public-site/doctor-directory.tsx`
   - Adds a stable `id` and matching `htmlFor` to the Specialty filter.
   - Ensures Playwright and assistive technology resolve the visible label as the select's accessible name.

2. `src/app/(public)/faq/page.tsx`
   - Expands the guest-booking FAQ item by default.
   - The statement that guest booking does not create a patient record is visible immediately, instead of being hidden inside a collapsed disclosure.

3. `src/components/public-site/public-site-layout.tsx`
   - Adds `min-w-0` and `overflow-x-clip` to the shared public-site frame.
   - Prevents off-canvas decorative/layout content from increasing the document's horizontal scroll width on narrow screens, without changing route content or applying a global body rule.

## Deliberately unchanged

- Auth-entry and email-change routes (their focused checks passed).
- About/Services navigation (its focused check passed).
- Existing test files and assertions.
- Booking APIs, authorization policies, availability rules, Prisma schema, migrations, and dependencies.
