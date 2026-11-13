# Phase 10 — Update 76: Patient Records, Billing, Complaints & Notifications

## Purpose

Complete the patient-facing record and post-visit experience by connecting the portal to the existing clinic domain models without recreating clinical or billing workflows.

## Delivered

- **Visit history details:** completed encounters only; shows doctor/specialty and encounter diagnoses. Draft and in-progress encounters are excluded.
- **Prescriptions:** only `ISSUED` prescriptions with a non-null issue timestamp attached to a `COMPLETED` encounter. Draft/cancelled prescriptions are excluded.
- **Laboratory results:** only `RELEASED` results with a non-null `releasedAt`, linked either to the authenticated patient's completed encounter or to that same patient's external laboratory intake. Result values are returned only after release.
- **Radiology reports:** only `RELEASED` reports with a non-null release timestamp linked to the authenticated patient's completed encounter. No draft, pending-approval, or merely approved-but-not-released report is returned.
- **Billing:** only invoices in `ISSUED`, `PAID`, `PARTIALLY_REFUNDED`, or `REFUNDED` state. Draft and voided invoices are excluded. Only `COMPLETED` payments are shown, alongside recorded refund status/history. No patient-side payment or refund mutation is exposed.
- **Complaints:** new portal complaints are created with `PATIENT_PORTAL` channel, a server-generated reference number, `RECEIVED` status, and a `RECEIVED` `ComplaintEvent` in the same Serializable transaction. Optional appointment/invoice references are checked against the authenticated patient before linking. Complaint history displays event/status/time only; internal employee notes and actor details are not returned.
- **Notifications:** only the patient's own `IN_APP` notifications already sent/delivered/read and scheduled by the current time are listed. Titles and bodies are deliberately replaced with a generic secure-update message so a result-ready message cannot expose clinical details in the notification list. Mark-as-read is a same-origin, patient-scoped update; notification IDs alone never grant access. No patient-notification producer was found in the inspected update archives, so the page consumes existing matching rows without claiming to generate new notifications.
- **Navigation:** Update 75's responsive patient portal navigation now links to Medical Records, Invoices & Receipts, Complaints, and Notifications.

## Authorization and privacy boundaries

Every API route uses `withPatientPortalRoute()` and derives `patientId` exclusively from the verified, directly linked patient actor. The API accepts no patient ID or role as an access credential. Read-model selects return explicit DTO fields rather than raw Prisma records. Billing and complaint relation filters are patient-scoped in the database query and, for optional complaint references, rechecked inside the write transaction.

**Delegated record access is not enabled by this Update.** The inspected `withPatientPortalRoute()` resolves the signed-in user's own verified Patient identity; it does not resolve a selected subject patient or call `requirePatientRecordAccess()` with `VIEW_MEDICAL_RECORDS`, `VIEW_DIAGNOSTIC_RESULTS`, or `VIEW_BILLING`. This Update therefore exposes only the signed-in patient's own data and does not expose a family member's records. A future delegated-record UI/API must use the exact existing scope guard per resource and must not reuse `BOOK_APPOINTMENTS` or generic portal access as proof of medical/billing access.

No patient route can create/edit prescriptions, release clinical results, alter invoices, record payments, approve/execute refunds, change complaint status, or mark another patient's notifications as read. Existing staff workflows remain authoritative.

## Capabilities intentionally not fabricated

The inspected application contracts do not currently provide a patient data-copy/correction request model or administrative processing workflow. The complaint model is not repurposed for statutory data-rights requests. This feature is therefore not implemented in this Update and requires an approved workflow/data contract before development.

The existing patient-document download service is employee-permission scoped and writes employee audit actors. No equivalent patient-authorized clinical-attachment download contract was present in the inspected modules; this Update does not expose storage keys or create permanent file URLs. Clinical/result attachment viewing remains outside this deliverable until a patient-scoped download service and storage policy are approved.

No notification producer or browser-push consent/delivery infrastructure was present in the inspected prior update packages. This Update consumes existing in-app notification records only; it does not invent appointment/result notification jobs or claim delivery by email, SMS, WhatsApp, or browser push.

## Database and dependencies

No Prisma model, enum, migration, seed, package, dependency, or environment change is included. All implemented behavior uses existing `Invoice`, `Payment`, `Refund`, `Complaint`, `ComplaintEvent`, `Notification`, `Encounter`, `Prescription`, `LabResult`, `RadiologyReport`, and related models.

## Verification status

The package includes unit validation tests and anonymous-access E2E tests. It has been checked for TypeScript/TSX syntax and source-file/import alignment against the archived Update 75/earlier project contracts. Full typecheck, lint, complete Vitest, Playwright, and production build must be run in the developer's local repository; those results cannot be inferred from the archived update packages.
