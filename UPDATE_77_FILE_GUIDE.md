# Update 77 — File-by-file guide

## New protected routes

| File | Purpose |
|---|---|
| `src/app/clinic-manager/layout.tsx` | Enforces Clinic Manager workspace entry and redirects anonymous sessions to `/login`. |
| `src/app/clinic-manager/page.tsx` | Operations dashboard route. |
| `src/app/clinic-manager/staff/page.tsx` | Staff oversight route. |
| `src/app/api/clinic-manager/overview/route.ts` | Aggregate operational metrics protected by `OPERATIONS_REPORT_READ`. |
| `src/app/api/clinic-manager/staff/route.ts` | Limited employee oversight data protected by `STAFF_OVERSIGHT_READ`. |

## UI components

| File | Purpose |
|---|---|
| `src/components/clinic-manager/clinic-manager-shell.tsx` | Responsive manager navigation and workspace shell. |
| `src/components/clinic-manager/manager-dashboard-view.tsx` | Dashboard cards, loading/error states, refresh action, and data-boundary note. |
| `src/components/clinic-manager/staff-oversight-view.tsx` | Staff status cards, active role coverage, and limited directory table. |

## Server-side data access

| File | Purpose |
|---|---|
| `src/server/clinic-manager/http.ts` | No-store JSON response helper. |
| `src/server/clinic-manager/overview-policy.ts` | Cairo-local date window conversion and pure staff role aggregation. |
| `src/server/clinic-manager/overview.ts` | Read-only Prisma aggregates and restricted employee listing. |

## Tests and docs

| File | Purpose |
|---|---|
| `tests/unit/clinic-manager-overview-policy.test.ts` | Unit coverage for Cairo date boundaries and role aggregation. |
| `tests/e2e/clinic-manager-workspace.spec.ts` | Browser redirect and anonymous API authorization tests. |
| `docs/clinic-manager/phase-11-update-77.md` | Scope, access boundaries, and exclusions. |
