# File Guide — MERUNO Specialty Card Fix 07

| File | Action | Purpose |
|---|---|---|
| `src/app/(public)/specialties/page.tsx` | Replace | Changes each specialty card into one accessible Next.js link covering the full card. Preserves the hover treatment and visible Explore cue without nested links. |
| `tests/e2e/public-discovery-booking.spec.ts` | Replace | Adds an end-to-end test that clicks the specialty heading inside the card and verifies navigation to the correct specialty details view. Existing discovery, booking, information-page, authorization, and mobile-width tests are preserved. |

No new runtime files, dependencies, environment variables, schema changes, migrations, or database operations are included.
