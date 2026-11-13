# MERUNO Update 73 — File-by-file guide

## New application files

| File | Action | Purpose |
|---|---|---|
| `src/app/(public)/layout.tsx` | Replace | Adds the shared MERUNO public-site header/footer wrapper around public pages. |
| `src/app/(public)/page.tsx` | Replace | Replaces the Phase 1 illustrative homepage shell with the full Home page and safe public specialty/service highlights. |
| `src/app/(public)/about/page.tsx` | Add | Adds the About MERUNO page using the approved single-branch clinic scope. |
| `src/app/(public)/services/page.tsx` | Add | Adds the Services overview for consultations, internal laboratory, Digital X-ray, and Ultrasound. |
| `src/app/(public)/loading.tsx` | Add | Adds a matching public-page loading skeleton. |
| `src/components/public-site/public-icon.tsx` | Add | Small local SVG icon set; no icon dependency is added. |
| `src/components/public-site/public-site-header.tsx` | Add | Responsive public navigation, MERUNO wordmark, and Patient Portal link. |
| `src/components/public-site/public-site-footer.tsx` | Add | Public footer with only approved information; no invented contact details. |
| `src/components/public-site/public-site-layout.tsx` | Add | Shared page frame and skip-to-content link. |
| `src/components/public-site/section-heading.tsx` | Add | Reusable section and page-intro typography. |
| `src/server/public-site/public-catalog.ts` | Add | Server-only adapter over the existing Phase 4C public clinic catalog. It returns a truthful unavailable state on catalog failure. |

## Test files

| File | Action | Purpose |
|---|---|---|
| `tests/e2e/public-site.spec.ts` | Replace | Covers Home, About, Services, English/LTR, Patient Portal navigation, mobile overflow, and preserves the existing health endpoint contract. |

## Documentation

| File | Action | Purpose |
|---|---|---|
| `docs/public-site/phase-10-update-73.md` | Add | Describes the delivered public pages, data source, and boundaries. |
| `docs/implementation-roadmap.md` | Replace | Records Phase 9 as complete per the developer's confirmation and Update 73 as the current Phase 10 increment. |
| `UPDATE_73_FILE_GUIDE.md` | Add | This file. |
| `APPLY_UPDATE_73.md` | Add | Copy/replace instructions and verification commands. |
| `UPDATE_73_SUMMARY.txt` | Add | Short update summary. |

## Deliberately unchanged

- `src/app/layout.tsx` and `src/app/globals.css`
- Existing design tokens, Inter Variable font, and UI primitives
- `src/server/clinic-master-data/master-data.ts` and Phase 4C API routes
- `prisma/schema.prisma`, all migrations, and generated Prisma Client
- `package.json`, `package-lock.json`, `.env`, `.git`, and the local database

No new package or migration is required.
