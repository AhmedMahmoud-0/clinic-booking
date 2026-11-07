# Update 31 — File-by-file guide

## Authorization

| File | Action | Purpose |
|---|---|---|
| `src/server/auth/authorization/types.ts` | Replace | Adds `CLINIC_MASTER_DATA_MANAGE` as a typed operation permission. |
| `src/server/auth/authorization/policy.ts` | Replace | Grants the new permission only to Clinic Manager and System Admin. No other role permissions are broadened. |

## Server domain layer

| File | Action | Purpose |
|---|---|---|
| `src/server/clinic-master-data/errors.ts` | Add | Safe typed errors for validation, not-found, and relationship conflicts. |
| `src/server/clinic-master-data/http.ts` | Add | No-store JSON responses, same-origin JSON parsing, and safe error mapping. |
| `src/server/clinic-master-data/master-data-validation.ts` | Add | Zod 4 schemas for specialty/profile updates, specialty mapping, service catalog maintenance, and doctor-service EGP pricing. |
| `src/server/clinic-master-data/master-data.ts` | Add | Minimal staff/public catalog DTOs and transaction-based mutations with atomic AuditLog writes. |

## Route Handlers

| File | Action | Purpose |
|---|---|---|
| `src/app/api/clinic/master-data/route.ts` | Add | Protected staff master-data listing. |
| `src/app/api/clinic/master-data/specialties/[specialtyId]/route.ts` | Add | Update an existing specialty without changing its code. |
| `src/app/api/clinic/master-data/doctors/[doctorId]/route.ts` | Add | Update only public/bookability fields of an existing DoctorProfile. |
| `src/app/api/clinic/master-data/doctor-specialties/route.ts` | Add | Atomically replace a doctor's specialty assignments and primary specialty. |
| `src/app/api/clinic/master-data/services/route.ts` | Add | Create an existing ServiceType service-catalog entry. |
| `src/app/api/clinic/master-data/services/[serviceId]/route.ts` | Add | Edit or soft-deactivate a service without changing historical references. |
| `src/app/api/clinic/master-data/doctor-services/route.ts` | Add | Create/update the service duration and current EGP price for one doctor. |
| `src/app/api/public/clinic-catalog/route.ts` | Add | Public read-only directory that omits private employee fields. |

## Tests

| File | Action | Purpose |
|---|---|---|
| `tests/unit/clinic-master-data-validation.test.ts` | Add | 20 tests for payload shape, specialty mapping, service types, duration, and EGP precision/range. |
| `tests/unit/clinic-master-data-permission.test.ts` | Add | 3 tests confirming only Clinic Manager and System Admin receive the new permission. |
| `tests/e2e/clinic-master-data.spec.ts` | Add | 2 tests for anonymous staff-endpoint denial and public DTO privacy/no-store behavior. |

## Documentation

| File | Action | Purpose |
|---|---|---|
| `docs/master-data/phase-4c-clinic-master-data.md` | Add | API, permission, data, audit, and scope contract. |
| `docs/implementation-roadmap.md` | Replace | Marks 4B2 complete from the developer's confirmation and tracks 4C as current. |
| `README.md` | Replace | Aligns the project status and current update with Phase 4C. |
| `APPLY_UPDATE_31.md` | Add | Apply and validation instructions. |
| `UPDATE_31_FILE_GUIDE.md` | Add | This file-by-file explanation. |
| `UPDATE_31_SUMMARY.txt` | Add | Short change summary. |

No Prisma schema, migration, seed, dependency, environment, or generated-client files are added or replaced.
