# Update 79 — File-by-file guide

## Protected workspace and pages

| File | Purpose |
|---|---|
| `src/app/system-admin/layout.tsx` | Enforces the existing `SYSTEM_ADMIN` workspace guard and handles anonymous/unauthorized access. |
| `src/app/system-admin/page.tsx` | Admin dashboard. |
| `src/app/system-admin/users/page.tsx` | Employee identity and role assignment page. |
| `src/app/system-admin/roles/page.tsx` | Read-only fixed permission matrix. |
| `src/app/system-admin/master-data/page.tsx` | Read-only clinic catalog overview via the existing Phase 4C API. |
| `src/app/system-admin/schedules/page.tsx` | Read-only schedule overview. |
| `src/app/system-admin/settings/page.tsx` | Configuration boundary and settings availability. |
| `src/app/system-admin/audit-logs/page.tsx` | Audit history search page. |
| `src/components/system-admin/system-admin-shell.tsx` | Responsive technical admin navigation and MERUNO workspace shell. |
| `src/components/system-admin/system-admin-views.tsx` | Dashboard, users, roles, catalog, schedule, settings, and audit views. |

## Protected APIs

| File | Purpose |
|---|---|
| `src/app/api/system-admin/overview/route.ts` | Safe technical dashboard counts. |
| `src/app/api/system-admin/users/route.ts` | Employee list and safe account-link state. |
| `src/app/api/system-admin/users/[employeeId]/roles/route.ts` | Audited grant/revoke of existing employee roles. |
| `src/app/api/system-admin/roles/route.ts` | Fixed role/permission matrix. |
| `src/app/api/system-admin/audit-logs/route.ts` | Filtered audit events without IP or clinical content. |
| `src/app/api/system-admin/schedules/route.ts` | Read-only clinic/doctor schedule overview. |

## Server modules

| File | Purpose |
|---|---|
| `src/server/system-admin/admin.ts` | Prisma read models and serializable role-assignment mutation with audit write. |
| `src/server/system-admin/http.ts` | No-store responses, same-origin JSON parsing, and safe error mapping. |
| `src/server/system-admin/policy.ts` | Pure safeguards for role grants, authority separation, and last-admin protection. |
| `src/server/system-admin/validation.ts` | Strict Zod schemas for role changes and audit filtering. |

## Tests and documentation

| File | Purpose |
|---|---|
| `tests/unit/system-admin-policy.test.ts` | 5 role-assignment policy tests. |
| `tests/e2e/system-admin-workspace.spec.ts` | Anonymous page/API protection tests. |
| `docs/system-admin/phase-11-update-79.md` | Scope, permissions, data/privacy boundaries, limitations, and Phase 11 status. |
| `APPLY_UPDATE_79.md` | Apply and verification instructions. |

## Deliberate exclusions

No schema/migration changes, new dependency, package script, writable system settings, custom permission/role builder, password UI, new invitation flow, catalog CRUD replacement, or schedule mutation API is included.
