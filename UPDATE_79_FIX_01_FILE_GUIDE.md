# MERUNO — Update 79 Fix 01 File Guide

| File | Status | Purpose |
|---|---|---|
| `src/components/system-admin/system-admin-views.tsx` | Replacement | Moves loading/error state updates out of the synchronous start of async loaders invoked by effects. Initial loading, refresh behavior, API error reporting, and post-operation reloads are retained. |
| `tests/e2e/clinic-manager-operations.spec.ts` | Replacement | Removes the closure-mutated `observedState` variable that TypeScript narrowed incorrectly. Polling still waits for login, authorized intake, or restricted state, then asserts the current rendered state. |
| `tests/e2e/system-admin-workspace.spec.ts` | Replacement | Checks the server-side 307 redirect and its `/login` Location header without depending on the flaky browser navigation timing reported in the test output. API authorization assertions remain unchanged. |
| `APPLY_UPDATE_79_FIX_01.md` | New | Application instructions, protected files, scope, and verification commands. |
| `UPDATE_79_FIX_01_FILE_GUIDE.md` | New | This file guide. |

## Scope boundaries

No UI redesign, permission-matrix change, endpoint behavior change, schema change, migration, package change, or environment change is included. The production System Admin layout continues to call `requireEmployeeWorkspace("SYSTEM_ADMIN")` and redirect unauthorized anonymous requests to `/login`.
