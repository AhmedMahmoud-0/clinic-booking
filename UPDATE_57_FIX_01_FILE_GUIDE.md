# Update 57 Fix 01 — File Guide

| File | Action | Change |
|---|---|---|
| `src/server/appointments/doctor-diagnosis.ts` | Replace | Adds `id: true` to `employeeSelect`, ensuring Prisma selects the employee identifier used by diagnosis records and audit events. |
| `src/app/api/doctor/diagnosis-catalog/route.ts` | Replace | Removes unused `AccountLinkError` import; no runtime behavior changes. |

No other files are required. No database or dependency operation is required.
