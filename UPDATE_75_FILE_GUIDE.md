# MERUNO Update 75 — File-by-file guide

## New portal pages

| File | Purpose |
|---|---|
| `src/app/portal/layout.tsx` | Server-side portal gate and shared patient portal shell. |
| `src/app/portal/page.tsx` | Patient dashboard route. |
| `src/app/portal/appointments/page.tsx` | Upcoming, past, and cancelled appointments. |
| `src/app/portal/appointments/[appointmentId]/page.tsx` | Appointment detail and self-service actions. |
| `src/app/portal/visits/page.tsx` | Completed visit-history list. |
| `src/app/portal/family/page.tsx` | Existing family delegation and access-grant view. |
| `src/app/portal/profile/page.tsx` | Read-only patient profile and separate account details. |

## New client components

| File | Purpose |
|---|---|
| `src/components/patient-portal/patient-portal-shell.tsx` | Responsive portal navigation, account security link, and existing Better Auth sign-out. |
| `src/components/patient-portal/dashboard-view.tsx` | Dashboard summary and upcoming appointments. |
| `src/components/patient-portal/appointments-view.tsx` | Appointment status tabs and appointment cards. |
| `src/components/patient-portal/appointment-detail-view.tsx` | Appointment details, availability lookup, cancellation, and rescheduling UI. |
| `src/components/patient-portal/visits-view.tsx` | Completed visit list without internal clinical content. |
| `src/components/patient-portal/family-access-view.tsx` | Existing delegation grant display and permitted approve/reject/revoke actions. |
| `src/components/patient-portal/profile-view.tsx` | Patient record and authentication account details. |
| `src/components/patient-portal/portal-format.ts` | Cairo-local date/time display helpers and safe labels. |

## New server read model

| File | Purpose |
|---|---|
| `src/server/patient-portal/read-model.ts` | Minimal appointment, dashboard, own-profile, and completed-visit DTO queries. Patient identity is always supplied from the server actor by the route handlers. |

## API routes

| File | Action | Purpose |
|---|---|---|
| `src/app/api/patient/appointments/route.ts` | Replace existing | Adds authenticated GET list while preserving the existing Phase 6B1 POST booking handler. |
| `src/app/api/patient/appointments/[appointmentId]/route.ts` | Add | Returns one appointment only when it belongs to the authenticated patient. |
| `src/app/api/patient/portal/dashboard/route.ts` | Add | Returns patient-specific summary and next confirmed appointments. |
| `src/app/api/patient/portal/profile/route.ts` | Add | Returns the authenticated patient's own read-only profile. |
| `src/app/api/patient/portal/visits/route.ts` | Add | Returns completed visit date and doctor/specialty only. |

## Test and documentation

- `tests/e2e/patient-portal.spec.ts` — anonymous portal page and API protection.
- `docs/patient-portal/phase-10-update-75.md` — implementation and authorization boundaries.
- `docs/implementation-roadmap.md` — marks Updates 73–74 accepted and Update 75 delivered for local verification.
- `UPDATE_75_FILE_GUIDE.md` — this guide.
- `APPLY_UPDATE_75.md` — merge and local verification instructions.
- `UPDATE_75_SUMMARY.txt` — short package summary.

## Existing files replaced

- `src/app/api/patient/appointments/route.ts` is the only application file replaced. Its existing patient-booking POST route is retained without changing its validation or domain service; the new authenticated GET is added alongside it.
- `docs/implementation-roadmap.md` is updated only in its latest status summary; the historical Phase 9 verification chronology is retained.

## Deliberately unchanged

- `prisma/schema.prisma`, migrations, generated Prisma Client, package manifests, lockfile, and `.env`.
- Existing patient authorization, delegation, appointment cancellation, rescheduling, and appointment availability services.
- Employee-only patient contact-profile update routes.
