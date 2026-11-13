# Apply MERUNO Update 74 — Fix 01

1. Stop the Next.js development server.
2. Back up the current project folder or commit the current state.
3. Extract this ZIP into the project root (`clinic-booking`).
4. Merge the `src` folder into the existing `src` folder and replace the three files at their exact paths:
   - `src/components/public-site/doctor-directory.tsx`
   - `src/app/(public)/faq/page.tsx`
   - `src/components/public-site/public-site-layout.tsx`
5. Do not replace any other files. No database or dependency command is required.
6. Start the focused verification from the project root:

```powershell
npx playwright test tests/e2e/public-discovery-booking.spec.ts tests/e2e/public-site.spec.ts --grep "public specialty and doctor directories are reachable|public information pages are reachable without invented contact details|new public pages fit narrow mobile widths|public pages have no horizontal overflow on narrow mobile widths" --workers=1 --reporter=list
```

The command runs only the four relevant test cases. It does not rerun the full E2E suite.
