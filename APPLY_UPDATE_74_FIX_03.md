# Apply MERUNO Update 74 — Fix 03

## What this fixes

The previous Fix 02 header replacement unintentionally reverted the Update 74 navigation to the older Update 73 links. As a result, `/specialties` and `/doctors` were not reachable from the public header through the expected `Doctors` link.

This patch restores the Update 74 public navigation, including `Specialties`, `Doctors`, `FAQ`, and `Contact`, while preserving the constrained header/container behavior from Fix 02.

## Replace one file only

`src/components/public-site/public-site-header.tsx`

Do not replace any other file. No database, dependency, environment, or migration change is included.

## Verify

Run the focused public directory test:

```powershell
npx playwright test tests/e2e/public-discovery-booking.spec.ts --grep "public specialty and doctor directories are reachable" --workers=1 --reporter=list
```
