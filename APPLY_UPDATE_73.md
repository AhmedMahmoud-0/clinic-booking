# Apply MERUNO Update 73 — Public Website Foundation & Core Pages

## 1. Before applying

1. Close the Next.js development server.
2. Make a copy of the current `clinic-booking` project folder.
3. Extract `MERUNO_Update_73_Public_Website_Foundation.zip` into a temporary folder.
4. Merge the extracted `src`, `tests`, and `docs` folders into the existing `clinic-booking` project root.

## 2. Files to replace

Replace only these existing files when Windows asks:

- `src/app/(public)/layout.tsx`
- `src/app/(public)/page.tsx`
- `tests/e2e/public-site.spec.ts`
- `docs/implementation-roadmap.md`

If `src/app/(public)/layout.tsx` does not exist in your current project, add it at that exact path.

## 3. New files

Copy every new file listed in `UPDATE_73_FILE_GUIDE.md` into the matching path, creating only the missing folders under `src`, `tests`, and `docs`.

Do not replace any file that is not listed in this guide.

## 4. Important files and local data to keep

Do not replace, delete, or overwrite:

- `.env`
- `.git`
- `node_modules`
- `.next`
- `generated/prisma`
- `package.json`
- `package-lock.json`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma7.config.ts`
- `src/app/layout.tsx`
- `src/app/globals.css`
- Existing Phase 4C server catalog files

## 5. Database and dependencies

- No Prisma schema change.
- No migration.
- No seed or database write.
- No `npm install`.
- No new dependency.
- Existing public clinic data is read through `getPublicClinicCatalog()` on the server.

## 6. Verify

From the project root, run:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Stop at the first failure and send the complete output. Do not apply Update 74 until Update 73 passes and its result is confirmed.

## 7. Manual browser review

Run:

```powershell
npm run dev
```

Open `https://localhost:3000` using the same local HTTPS setup already used by this project.

Review these routes:

- `/`
- `/about`
- `/services`

Check desktop and narrow mobile layouts, the mobile navigation menu, footer links, Patient Portal link (`/login`), and that no horizontal scrolling appears.

## 8. Scope notes

- The UI remains English-only and LTR-only. No translation system or language switch is introduced.
- The public website does not invent contact details, doctor credentials, reviews, ratings, or clinic statistics.
- Only outpatient consultations, internal laboratory, Digital X-ray, and Ultrasound are presented.
- The full booking journey will be connected in Update 74; this update links users to the current services and patient portal entry points.
- Patient Portal screens are delivered in Updates 75–76.
