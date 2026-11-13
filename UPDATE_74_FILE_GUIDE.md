# MERUNO Update 74 — File-by-file guide

## New public routes

| File | Purpose |
|---|---|
| `src/app/(public)/specialties/page.tsx` | Active public specialty directory from the existing Phase 4C catalog. |
| `src/app/(public)/specialties/[specialtyId]/page.tsx` | Specialty details, related public doctors, related consultation services, and booking CTA. |
| `src/app/(public)/doctors/page.tsx` | Public doctor directory page. |
| `src/app/(public)/doctors/[doctorId]/page.tsx` | Approved public doctor profile. |
| `src/app/(public)/faq/page.tsx` | Public FAQ with answers grounded in existing clinic/booking rules. |
| `src/app/(public)/contact/page.tsx` | Contact page that explicitly avoids publishing unverified contact information. |
| `src/app/(public)/privacy/page.tsx` | Clearly labelled draft demonstration privacy placeholder pending legal review. |
| `src/app/(public)/terms/page.tsx` | Clearly labelled draft demonstration terms placeholder pending legal review. |
| `src/app/(public)/not-found.tsx` | Public not-found experience for the public route group. |
| `src/app/(public)/book-appointment/page.tsx` | Server page that loads the existing safe public catalog and supplies it to the booking UI. |

## New UI components

| File | Purpose |
|---|---|
| `src/components/public-site/doctor-directory.tsx` | Search and specialty filtering for the public doctor catalog. |
| `src/components/public-site/appointment-booking-flow.tsx` | Five-stage public booking interface, slot lookup, guest/account paths, submission, and confirmation. |

## New authenticated server route and policy

| File | Purpose |
|---|---|
| `src/app/api/patient/booking-context/route.ts` | Authenticated, no-store patient booking context. Derives actor from `withPatientPortalRoute`; does not accept client actor/patient authority. |
| `src/server/appointments/patient-booking-context-policy.ts` | Pure adapter that filters delegated booking options through existing `isPatientBookingAuthorized()` policy. |

## Existing public components replaced

| File | Change |
|---|---|
| `src/components/public-site/public-site-header.tsx` | Adds specialty/doctor/FAQ/contact navigation and makes Book Appointment the primary CTA; Patient Portal remains available. Desktop navigation moves to the extra-wide breakpoint to avoid crowding. |
| `src/components/public-site/public-site-footer.tsx` | Adds directory, booking, FAQ, Contact, Privacy, and Terms navigation. |

## Tests added

| File | Coverage |
|---|---|
| `tests/unit/patient-booking-context-policy.test.ts` | Self identity, verified guardian/minor grant, scope restriction, inactive/pending/expired/revoked access, and adult approval. |
| `tests/e2e/public-discovery-booking.spec.ts` | Public directory routes, FAQ/contact/legal pages, booking stepper entry, and anonymous denial of patient booking context. |

## Documentation

- `docs/public-site/phase-10-update-74.md`
- `docs/appointments/phase-10-public-booking-ui.md`
- `docs/implementation-roadmap.md` — marks Update 73 accepted and Update 74 current, while retaining Phase 9 closure.
- `README.md`
- `UPDATE_74_FILE_GUIDE.md`
- `APPLY_UPDATE_74.md`
- `UPDATE_74_SUMMARY.txt`

## Deliberately unchanged

- `src/server/clinic-master-data/master-data.ts` and `GET /api/public/clinic-catalog`.
- `src/server/appointments/appointment-availability.ts` and `GET /api/public/appointment-availability`.
- `src/server/appointments/appointment-booking.ts` and both existing booking POST routes.
- Existing authorization guards, delegation grant policy, and database constraints.
- `prisma/schema.prisma`, all migrations, seeds, generated Prisma client, package files, and environment variables.
- Root application layout, global CSS, and the Update 73 homepage/About/Services source files.

No new package or database migration is required.
