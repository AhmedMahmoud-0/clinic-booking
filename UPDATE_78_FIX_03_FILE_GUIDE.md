# MERUNO Update 78 — Fix 03 File Guide

| File | Change |
|---|---|
| `tests/e2e/clinic-manager-operations.spec.ts` | Replaces the immediate `isVisible()` branch with bounded polling for the actual authorization outcome. Keeps anonymous API protection tests and validates either the allowed Reception form or explicit denied state. |
| `APPLY_FIX_03.md` | Exact application and verification instructions. |
| `UPDATE_78_FIX_03_FILE_GUIDE.md` | This file guide. |

Only the E2E test and package documentation are changed. No runtime code is modified.
