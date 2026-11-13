# MERUNO Update 76 — Patient Records, Billing, Complaints & Notifications

## New protected portal pages

| File | Purpose |
|---|---|
| `src/app/portal/records/page.tsx` | Combined patient-facing page for completed visits, issued prescriptions, released laboratory results, and released radiology reports. |
| `src/app/portal/billing/page.tsx` | Issued invoice, completed-payment, and refund-history view. |
| `src/app/portal/complaints/page.tsx` | Complaint submission, reference number, status, and non-confidential event timeline. |
| `src/app/portal/notifications/page.tsx` | In-app notification list and mark-as-read action. |

All pages use the authenticated `/portal` layout from Update 75.

## New client components

| File | Purpose |
|---|---|
| `src/components/patient-portal/records-view.tsx` | Displays only completed encounters, issued prescriptions, released lab results, and released radiology reports. |
| `src/components/patient-portal/billing-view.tsx` | Displays issued invoices, invoice lines, completed payments, and refund status/history. |
| `src/components/patient-portal/complaints-view.tsx` | Patient complaint form and status history. |
| `src/components/patient-portal/notifications-view.tsx` | In-app notification list and patient-scoped read action. |
| `src/components/patient-portal/patient-portal-shell.tsx` | Replaces Update 75 version to add navigation to the four new patient portal sections. |

## New server modules

| File | Purpose |
|---|---|
| `src/server/patient-portal/update76-read-model.ts` | Server-only patient-scoped read models and complaint/notification operations. IDs are taken from the authenticated actor in route handlers, never from client-supplied patient IDs. |
| `src/server/patient-portal/update76-validation.ts` | Strict Zod contract for patient complaint submission. Actor, status, event, reference number, and patient association cannot be supplied by the client. |

## New API routes

| File | Method | Purpose |
|---|---|---|
| `src/app/api/patient/portal/records/route.ts` | GET | Completed visits, issued prescriptions, released lab results, and released radiology reports. |
| `src/app/api/patient/portal/billing/route.ts` | GET | Patient-owned issued invoices, completed payment records, and refund history. |
| `src/app/api/patient/portal/complaints/route.ts` | GET / POST | List the patient's own portal complaints and submit a new complaint with an atomic initial history event. |
| `src/app/api/patient/portal/notifications/route.ts` | GET | List delivered/sent/read in-app notifications for the authenticated patient. |
| `src/app/api/patient/portal/notifications/[notificationId]/read/route.ts` | POST | Mark one in-app notification as read only when it belongs to the authenticated patient. |

## Tests and documentation

- `tests/unit/patient-portal-update76-validation.test.ts` — validates complaint input and rejects forged patient/status/employee fields.
- `tests/e2e/patient-portal-update76.spec.ts` — verifies anonymous page redirects and anonymous API denial/no-store headers.
- `docs/patient-portal/phase-10-update-76.md` — delivered behavior, query-release rules, security boundaries, and deliberately unsupported capabilities.
- `docs/implementation-roadmap.md` — records Update 76 as delivered for local verification, not as closed.
- `APPLY_UPDATE_76.md` — merge and verification steps.
- `UPDATE_76_SUMMARY.txt` — concise package summary.

## Existing files replaced

Only `src/components/patient-portal/patient-portal-shell.tsx` is replaced among application files. It is based on the accepted Update 75 shell and adds navigation items. Existing auth, booking, appointments, profile, family/delegation, and visit-history components/routes remain unchanged.

## Deliberately unchanged

- `prisma/schema.prisma`, migrations, generated Prisma Client, seeds, package manifests, lockfile, and dependencies.
- Phase 7 clinical authoring/review/release workflows.
- Phase 8 laboratory/radiology review and release services.
- Phase 9 invoice/payment/refund logic and cashier APIs.
- Existing patient identity, account-linking, delegation, and route-authorization policies.
- No payment gateway, patient-side refund execution, email/SMS/WhatsApp/push delivery, or unrestricted data export.
