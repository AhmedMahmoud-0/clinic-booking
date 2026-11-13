# Update 78 Fix 01 — File Guide

| Path | Change |
|---|---|
| `src/components/clinic-manager/complaints-management-view.tsx` | JSX text escaping only; fixes ESLint without changing the rendered wording or workflow. |
| `tests/e2e/clinic-manager-operations.spec.ts` | Tests manager login redirects separately from Reception's explicit permission-denied state. It also verifies that the complaint intake form is not rendered for unauthorized accounts. |

No API, domain service, permission matrix, Prisma model, migration, dependency, package manifest, or environment file is changed.
