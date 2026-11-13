# Update 78 — File-by-file guide

## New server-side modules

| File | Purpose |
|---|---|
| `src/server/clinic-manager/operations-validation.ts` | Strict Reception complaint intake, complaint/incident transition schemas, and 93-day operational report query validation. |
| `src/server/clinic-manager/operations-policy.ts` | Complaint/incident transition rules, reporting duration aggregates, and Cairo report-window helper using Update 77's existing Cairo utilities. |
| `src/server/clinic-manager/operations.ts` | Reception complaint intake, manager complaint worklist/transitions, incident intake/transitions, audit writes, and aggregate operational report read model. |

## New API routes

| File | Purpose |
|---|---|
| `src/app/api/clinic-manager/complaints/route.ts` | Permission-protected complaint worklist and status filter. |
| `src/app/api/clinic-manager/complaints/[complaintId]/transition/route.ts` | Audited complaint status transition. |
| `src/app/api/clinic-manager/incidents/route.ts` | Confidential incident list and manager incident intake. |
| `src/app/api/clinic-manager/incidents/[incidentId]/transition/route.ts` | Audited incident status transition. |
| `src/app/api/clinic-manager/reports/operations/route.ts` | Aggregate operational report API. |
| `src/app/api/reception/complaints/route.ts` | Reception-only phone/in-person complaint intake using `complaint.intake`; server-generated reference and employee identity. |

## New pages

| File | Purpose |
|---|---|
| `src/app/clinic-manager/complaints/page.tsx` | Complaint queue and status history. |
| `src/app/clinic-manager/incidents/page.tsx` | Confidential incident intake/register. |
| `src/app/clinic-manager/billing/approvals/page.tsx` | Reuses existing Phase 9B manager approvals workbench. |
| `src/app/clinic-manager/reports/operations/page.tsx` | Operational reports and aggregate service turnaround. |
| `src/app/clinic-manager/reports/financial/page.tsx` | Reuses existing Phase 9B financial reporting workbench. |
| `src/app/reception/complaints/layout.tsx` | Permission-protected Reception intake shell. |
| `src/app/reception/complaints/page.tsx` | Reception complaint intake route. |

## New UI components

| File | Purpose |
|---|---|
| `src/components/clinic-manager/complaints-management-view.tsx` | Complaint filter, worklist, event timeline, and allowed transitions. |
| `src/components/clinic-manager/incidents-management-view.tsx` | Incident create form, severity/status register, and review transitions. |
| `src/components/clinic-manager/operations-report-view.tsx` | Cairo-date-filtered operational report, aggregates, doctor-level visit counts, and financial report handoff. |
| `src/components/reception/reception-complaint-intake-view.tsx` | Reception form for phone/in-person complaint intake and server-issued reference confirmation. |

## Existing file replaced

| File | Change |
|---|---|
| `src/components/clinic-manager/clinic-manager-shell.tsx` | Adds navigation links for complaints, incidents, approvals, and reports. Existing shell layout, sign-out, and workspace identity are preserved. |

## Tests and documentation

- `tests/unit/clinic-manager-operations-policy.test.ts` — includes strict Reception intake validation.
- `tests/e2e/clinic-manager-operations.spec.ts` — includes anonymous Reception intake route/API checks.
- `docs/clinic-manager/phase-11-update-78.md`
- `APPLY_UPDATE_78.md`
- `UPDATE_78_SUMMARY.txt`

## Existing Phase 9B dependencies reused, not included or replaced

- `src/components/billing/clinic-manager-billing-approvals-workbench.tsx`
- `src/components/billing/billing-financial-reports-workbench.tsx`
- Existing `/api/clinic-manager/billing/discount-approvals*` and `/api/clinic-manager/billing/refund-approvals*` routes
- Existing `/api/billing/reports/financial` route
- Existing `src/server/billing/billing-phase-9b.ts`

These are already present from Phase 9B and must remain unchanged.
