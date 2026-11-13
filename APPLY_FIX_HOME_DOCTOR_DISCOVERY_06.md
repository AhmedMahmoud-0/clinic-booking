# MERUNO — Home & Doctor Discovery Fix 06

## Apply

1. Stop the Next.js development server.
2. Back up the current `clinic-booking` folder.
3. Extract this ZIP to a temporary folder.
4. Merge the included `src` folder into the project root and replace only the five paths listed in `FILE_GUIDE.md`.
5. Keep all existing generated doctor images under `public/images/doctors/`; this fix does not replace or remove them.

## What this fix addresses

- Removes `next/image` `fill` positioning warnings by rendering the generated portrait assets at their native 480×600 dimensions and sizing them with CSS.
- Reworks the doctor-directory card so its portrait and information area are one real profile link. The footer actions remain separate links: `View profile` and `Book`.
- Applies the same non-overlapping card-link structure to doctors shown on specialty detail pages.
- Makes homepage specialty cards use a direct same-origin navigation anchor to their matching specialty page.
- Adds a clipping boundary to the public layout and constrains its content wrapper to the viewport width to prevent horizontal document overflow on narrow screens.

## Files to replace

- `src/components/public-site/doctor-portrait.tsx`
- `src/components/public-site/doctor-directory.tsx`
- `src/app/(public)/specialties/[specialtyId]/page.tsx`
- `src/app/page.tsx`
- `src/components/public-site/public-site-layout.tsx`

No other files are required for this fix.

## Protected files

Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `prisma/schema.prisma`, `prisma/migrations`, `prisma/seed.sql`, `prisma7.config.ts`, or any authentication, booking, patient, or authorization service.

## Database and dependencies

- No Prisma changes, migration, seed, `db push`, database reset, or data modification.
- No new dependency or `npm install`.
- No environment changes.
- Existing eight local doctor portrait assets are reused unchanged.

## Verify

Run from the project root:

```powershell
npm run typecheck
npm run lint
npx vitest run tests/unit/patient-booking-context-policy.test.ts
npx playwright test tests/e2e/public-homepage-doctor-discovery.spec.ts tests/e2e/public-discovery-booking.spec.ts --workers=1 --reporter=list
npm run build
```

The relevant acceptance checks are:

- Every homepage specialty tile navigates to the selected specialty detail page.
- Clicking the main body of a doctor card opens that doctor's profile.
- `View profile` still opens the profile, and `Book` still opens booking with the selected doctor.
- Portraits load without the `fill` parent-position warning.
- `/`, `/doctors`, and `/specialties` do not exceed a 320px viewport width.
