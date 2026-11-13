# MERUNO — Homepage & Doctor Discovery UX Completion

## 1. Before applying

1. Stop the Next.js development server.
2. Make a backup copy of the current `clinic-booking` project folder.
3. Extract this ZIP into a temporary folder.
4. Merge its `src`, `public`, and `tests` folders into the existing project root.
5. Replace the files listed in `FILE_GUIDE.md` and add all new files at their exact paths.

## 2. What this package changes

- Adds direct homepage paths to Book an Appointment, Find a Doctor, and Explore Specialties.
- Makes homepage specialty cards open their specialty details, where the related doctors are listed.
- Makes the patient/staff account panel open `/login` rather than acting as a decorative, non-clickable panel.
- Removes the repeated, low-value homepage CTA pair and uses clearer specialty and booking actions.
- Adds eight generated, fictional doctor portraits, keyed to the existing eight synthetic seed doctor IDs.
- Shows the same doctor portrait in the directory, specialty detail cards, and doctor profile page.
- Makes the full doctor card open the doctor's profile while keeping the visible View Profile and Book actions independently usable.
- Preserves the current public navigation label `Sign in` in both desktop and mobile menus.
- Adds E2E checks for homepage destinations, specialty-to-doctor navigation, doctor portraits, whole-card navigation, and narrow mobile layout.

## 3. Exact files to replace

- `src/app/page.tsx`
- `src/components/public-site/doctor-directory.tsx`
- `src/components/public-site/public-site-header.tsx`
- `src/app/(public)/doctors/[doctorId]/page.tsx`
- `src/app/(public)/specialties/[specialtyId]/page.tsx`

## 4. New files and assets

- `src/components/public-site/doctor-portrait.tsx`
- `tests/e2e/public-homepage-doctor-discovery.spec.ts`
- Eight WebP portraits under `public/images/doctors/`

The portraits are AI-generated fictional portfolio assets, not photographs of real clinicians and not claims about real medical professionals. The implementation uses the existing seed IDs `seed_doctor_MER-DR-001` through `seed_doctor_MER-DR-008`. If the public catalogue contains another doctor ID, the component safely falls back to initials instead of displaying another doctor's photo.

## 5. Preserve these existing project files

Do not replace or delete:

- `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`
- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`
- `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.sql`, `prisma7.config.ts`
- `src/app/layout.tsx`, `src/app/globals.css`
- `src/app/(public)/layout.tsx`, `src/app/(public)/about/page.tsx`, `src/app/(public)/services/page.tsx`
- `src/components/public-site/public-site-footer.tsx`
- Existing public catalogue, appointment, authentication, and authorization services
- Your latest Authentication UI changes and all database data

**Important route note:** Keep the homepage at `src/app/page.tsx`, as established by Update 73 Fix 01. Do not restore the misplaced `src/app/(public)/page.tsx` file. The public route-group layout remains in place for About, Services, Doctors, Specialties, and the other public routes.

## 6. Database and dependencies

- No Prisma schema changes.
- No migration, seed, `db push`, reset, or database write.
- No `npm install` and no new dependency.
- Images are local static assets; no external image service is required at runtime.

## 7. Verification

Run from the project root:

```powershell
npm run typecheck
npm run lint
npx playwright test tests/e2e/public-homepage-doctor-discovery.spec.ts tests/e2e/public-discovery-booking.spec.ts --workers=1 --reporter=list
npm run build
```

## 8. Manual browser review

Run `npm run dev`, then inspect:

- `/` — Book an appointment, Find a doctor, Explore specialties, and the account sign-in panel.
- `/doctors` — all eight doctor portraits, search/filter, full-card click, View Profile, and Book.
- One `/specialties/[specialtyId]` page — related doctors and their portraits.
- One `/doctors/[doctorId]` page — full doctor portrait and Book an appointment.

At a narrow mobile width, verify the hamburger menu still includes `Sign in`, and the homepage CTAs and doctor cards remain usable without horizontal overflow.
