# MERUNO Public Site Mobile Header Fix 13

## Apply
1. Stop the Next.js development server.
2. Extract this ZIP at the project root and merge the folders.
3. Replace only the three files listed in FILE_GUIDE.md.
4. Restart the focused checks below.

## What this fixes
- The latest browser report shows a header link still extending to 334px on a 320px viewport.
- Adds component-scoped CSS media rules to hide the desktop navigation and desktop action group below 1280px, independently of Tailwind responsive utility generation.
- Keeps the mobile navigation menu visible below 1280px and hides it at desktop widths.
- Adds explicit Playwright assertions that desktop navigation/actions are hidden and the mobile menu trigger is visible at narrow widths.
- Improves overflow diagnostics on specialty/doctor/public pages to report the actual elements extending past the viewport.

No route, homepage content, specialty-card behavior, booking logic, patient authorization, database, or portal files are changed.
