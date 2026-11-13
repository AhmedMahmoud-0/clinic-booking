# Update 79 Fix 02 — File Guide

| Path | Status | Change |
|---|---|---|
| `src/components/system-admin/system-admin-views.tsx` | Replace | Reworks initial dashboard, employee-list, and audit-log requests so React state updates run only in asynchronous Promise handlers. Adds unmount guards. Keeps refresh/search/mutation behavior intact. |
| `tests/e2e/system-admin-workspace.spec.ts` | Replace | Tests anonymous page redirects using either a direct 307 Location response or Next.js streamed HTML meta refresh to `/login`; retains the 401/no-store API assertions. |

No files are added to the application source tree. No database, environment, or dependency files are included.
