# MERUNO Update 73 Fix 01 — File Guide

| File | Action | Purpose |
|---|---|---|
| `src/app/page.tsx` | Replace | Mounts the completed Update 73 homepage on the original root `/` route and wraps it with the shared public header/footer. This resolves the mismatch where `/` continued to render the original Phase 1 homepage. |
| `APPLY_UPDATE_73_FIX_01.md` | Add | Gives exact replacement and deletion instructions. |
| `UPDATE_73_FIX_01_FILE_GUIDE.md` | Add | This file. |

## Required manual deletion

Delete `src/app/(public)/page.tsx`, which was introduced by Update 73 at the wrong route location. Keep the route-group layout and its About and Services pages.

## Unchanged

No tests, translations, app root layout, global CSS, package files, dependencies, environment files, database models, migrations, or existing server-side domain logic are changed by this fix.
