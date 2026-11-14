# MERUNO — Phase 10 Portal and Footer Completion

## Public navigation and footer

- The public header uses **Sign in** for the shared `/login` route on desktop and mobile.
- The footer uses the same MERUNO monogram and wordmark as the public header.
- The footer surface uses the approved pale-mint clinical palette and groups links into Explore MERUNO, Find care, Patient support, and Legal.
- Footer destinations use existing public routes only; no new contact details or unsupported links are introduced.

## Patient Portal navigation

The protected Patient Portal navigation now exposes every existing patient-facing route:

- Dashboard
- My Appointments
- Visit History
- Medical Records
- Invoices & Receipts
- Family & Access
- Complaints
- Notifications
- My Profile

The mobile menu uses the same destinations and closes after a navigation selection.

## Patient dashboard

The server-derived summary now includes counts for:

- Confirmed upcoming appointments
- Completed visits
- Issued prescriptions for completed encounters
- Released laboratory results for the authenticated patient
- Released radiology reports for the authenticated patient

The dashboard also shows a short recent-visit list with a route to the corresponding visit detail page. Counts and rows are read using the authenticated patient ID resolved by the server. No client-supplied patient ID is accepted.

## Visit details

A new protected route `/portal/visits/[visitId]` and API route `/api/patient/portal/visits/[visitId]` provide details only when the encounter:

- belongs to the authenticated patient,
- has `COMPLETED` status, and
- passes the existing patient portal authorization guard.

The patient-facing view shows doctor, specialty, date, completed status, and recorded diagnoses. It does not expose draft notes, internal staff notes, or unreleased records. Issued prescriptions and released diagnostic results remain in Medical Records.

## Printing patient-visible records

The patient Medical Records view now offers a print-ready view for issued prescriptions and released laboratory/radiology results. The content is escaped before being written to a separate print document. The browser print dialog can be used to print or save as PDF; this is not a new server-side attachment/download endpoint.

## Explicitly deferred capabilities

The current project does not contain a dedicated persisted Patient Data Request model, administrative request queue, approval lifecycle, or request-status API. The Profile page now explains this honestly rather than implying that a request can be filed through the non-connected public Contact page. A trackable copy/correction workflow still requires an approved data model and administrative handling path.

The current patient family view continues to show verified delegation requests and scopes. It does not infer or enumerate every family relationship independently of those records. Family relationships without a corresponding verified and authorized portal context are not exposed.

The current notification page continues to display and mark existing patient notifications as read. This update does not add notification generation to appointment/result lifecycle events.

## Data and security boundaries

- No Prisma schema change or database migration.
- No dependency or package-script change.
- No client-supplied patient ID or role is trusted.
- Dashboard medical metrics count only issued/released patient-facing records.
- Visit details are scoped to the authenticated patient and completed encounters.
- No draft clinical note, internal note, or unreleased diagnostic result is exposed.
