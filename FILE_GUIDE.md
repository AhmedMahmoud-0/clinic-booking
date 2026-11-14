# File Guide — Fix 13

Replace these three files only:

1. `src/components/public-site/public-site-header.tsx` — adds explicit media-query enforcement for desktop versus mobile navigation, retaining the existing desktop links and mobile menu actions.
2. `tests/e2e/public-site.spec.ts` — checks the responsive header state on each narrow viewport before the existing page overflow assertions.
3. `tests/e2e/public-discovery-booking.spec.ts` — performs the same header checks and reports detailed overflow offenders on directory and booking pages.
