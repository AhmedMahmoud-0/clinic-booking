# Update 32 — File-by-file guide

| File | Action | Responsibility |
| --- | --- | --- |
| `src/server/diagnostic-master-data/validation.ts` | Add | Strict Zod input contracts for lab tests/components, radiology procedures/resources, EGP prices, durations, and soft-deactivation updates. |
| `src/server/diagnostic-master-data/diagnostic-master-data.ts` | Add | Server-only Prisma reads and transactional catalog mutations. Includes atomic audit logging, DTO shaping, historical price safety, and resource deactivation checks. |
| `src/app/api/clinic/diagnostic-master-data/route.ts` | Add | Protected staff-only diagnostic catalog listing. |
| `src/app/api/clinic/diagnostic-master-data/lab-tests/route.ts` | Add | Create laboratory tests. |
| `src/app/api/clinic/diagnostic-master-data/lab-tests/[labTestId]/route.ts` | Add | Update laboratory test metadata, price, turnaround, preparation, and active state. |
| `src/app/api/clinic/diagnostic-master-data/lab-tests/[labTestId]/components/route.ts` | Add | Add typed result components to an active lab test. |
| `src/app/api/clinic/diagnostic-master-data/lab-test-components/[componentId]/route.ts` | Add | Update component name, unit, ordering, and active state. Component code/value type are immutable. |
| `src/app/api/clinic/diagnostic-master-data/radiology-procedures/route.ts` | Add | Create digital X-ray or ultrasound procedures. |
| `src/app/api/clinic/diagnostic-master-data/radiology-procedures/[procedureId]/route.ts` | Add | Update procedure details, default duration, EGP price, preparation, and active state. |
| `src/app/api/clinic/diagnostic-master-data/radiology-resources/route.ts` | Add | Create digital X-ray or ultrasound rooms/resources. |
| `src/app/api/clinic/diagnostic-master-data/radiology-resources/[resourceId]/route.ts` | Add | Update resource name/location/active state; prevents deactivation with scheduled/in-progress exams. |
| `tests/unit/diagnostic-master-data-validation.test.ts` | Add | 26 validation cases covering strict inputs, supported modalities, prices, durations, component immutability, and active-state updates. |
| `tests/e2e/diagnostic-master-data.spec.ts` | Add | Confirms anonymous users cannot read or create diagnostic master data and responses are no-store. |
| `docs/diagnostics/phase-4d-diagnostic-master-data.md` | Add | API contract, permission boundary, lifecycle rules, snapshots, scope restrictions, and deferred workflows. |
| `docs/implementation-roadmap.md` | Replace | Records Phase 4C complete and Phase 4D as the current implementation step. |
| `README.md` | Replace | Synchronizes project status and current implementation phase. |
