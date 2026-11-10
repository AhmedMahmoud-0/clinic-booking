# Update 54 — File-by-file guide

## New files

| File | Purpose |
| --- | --- |
| `src/app/api/doctor/queue/route.ts` | Protected `GET /api/doctor/queue`; requires `clinical.assigned.read` and passes only the authenticated employee ID to the worklist service. |
| `src/server/appointments/doctor-worklist.ts` | Resolves the authenticated employee's linked DoctorProfile, rechecks active Doctor assignment inside a transaction, reads that doctor's current Cairo-local-day queue, and maps minimal response DTOs. |
| `src/server/appointments/doctor-worklist-policy.ts` | Pure Doctor actor eligibility, queue-state summary, and waiting-time policies. |
| `tests/unit/doctor-worklist-policy.test.ts` | Six policy tests for active Doctor role, status counts, wait-time boundaries, and invalid dates. |
| `tests/e2e/doctor-worklist.spec.ts` | Two unauthenticated Route Handler protection tests, including a caller attempt to append a different doctor ID. |
| `docs/clinical/phase-7a-doctor-queue-worklist.md` | Scope, access-control, DTO, and non-goal documentation for Phase 7A. |

## Replaced files

| File | What changed |
| --- | --- |
| `README.md` | Marks Update 53 complete using the developer-confirmed results and records Update 54 / Phase 7A as the current unverified increment. |
| `docs/implementation-roadmap.md` | Closes Phase 6D4, sets Phase 7A as current, and documents the Doctor current-day queue API and the future encounter-start boundary. |

## Intentionally unchanged

- `prisma/schema.prisma` and every migration/seed file.
- `package.json`, lockfile, environment files, and dependencies.
- Existing Reception APIs and queue allocation/calling policies.
- Existing authorization role/permission definitions; this increment reuses `clinical.assigned.read`.
- All existing patient, appointment, encounter, and clinical-record workflows.

## Expected verification additions

- Unit: 6 tests in `doctor-worklist-policy.test.ts`.
- E2E: 2 tests in `doctor-worklist.spec.ts`.

The E2E tests establish unauthenticated protection only; they do not replace local authenticated-role/data-scope testing. The route's production service additionally rechecks active Doctor assignment and DoctorProfile ownership before reading the queue.
