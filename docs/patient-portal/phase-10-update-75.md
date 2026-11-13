# Phase 10 — Update 75: Patient Portal Foundation and Appointment Self-Service

## Delivered scope

- Protected `/portal` layout using the existing `requirePatientPortalAccess()` authorization guard.
- Responsive Patient Portal navigation for Dashboard, My Appointments, Visit History, Family & Access, and My Profile.
- Dashboard summary and next confirmed appointments from the signed-in patient's own patient identity.
- Upcoming, past, and cancelled appointment lists, plus a patient-scoped appointment detail endpoint and page.
- Appointment cancellation and rescheduling controls that call the existing Phase 6C patient endpoints. The existing service rechecks exact appointment-management authority, status, the 24-hour boundary, and current availability inside its transaction.
- Completed visit-history list. It returns only visit date and doctor/specialty labels; it does not return diagnoses, draft notes, prescriptions, or internal clinical details.
- Read-only patient profile view showing the signed-in patient's clinic record and account email separately.
- Existing patient delegation list, approval/rejection, and revocation flows surfaced in the Family & Access screen. The portal does not create a new delegation model or broaden access scopes.
- Focused E2E coverage for anonymous page and API denial.

## Authorization and data boundaries

- Portal pages call `requirePatientPortalAccess()` server-side. Anonymous requests are redirected to `/login`; authenticated accounts without an active verified patient identity receive an access-required page.
- Every new patient read API is wrapped with `withPatientPortalRoute()` and derives its patient identifier from the verified server actor.
- Appointment list/detail queries use `patientId: actor.patientId`. Appointment identifiers in URLs are not treated as proof of permission.
- Existing `/cancel` and `/reschedule` routes remain the only mutation endpoints. They enforce `MANAGE_APPOINTMENTS` where delegation applies. The new UI does not call employee-only appointment APIs.
- Family & Access uses the existing `/api/patient/delegations` and its existing decision/revoke routes. It displays scopes and dates returned by that service and exposes actions only when its `canDecide` / `canRevoke` flags permit them.
- Visit history includes only `EncounterStatus.COMPLETED` rows and returns no clinical note or diagnosis content.
- Profile data is restricted to the authenticated patient's own patient row and linked authentication email. Clinic demographic/contact self-edit is intentionally not shown because no patient self-service update contract exists in the reviewed implementation.
- API responses use the existing no-store `accountLinkJson()` helper.

## Existing capabilities reused

- Phase 3F: patient portal route guard and patient actor resolution.
- Phase 3G-C: patient delegation listing, approval/rejection, and revocation.
- Phase 5C: existing patient contact profile read model was reviewed; its existing mutation route is employee-permission-only and is not exposed to patients.
- Phase 6C1: patient appointment cancellation policy and service.
- Phase 6C2: patient appointment rescheduling policy and service.
- Phase 6A: public appointment availability for rescheduling slot display.

## Deliberately unchanged

- No Prisma schema or migration changes.
- No package/dependency changes.
- No changes to booking, cancellation, rescheduling, identity-linking, guardian verification, or delegation business rules.
- No patient self-service demographic edit endpoint was invented.
- No draft encounters, internal notes, unapproved diagnoses, prescriptions, results, billing records, or another patient's records are exposed.

## Local verification

Run typecheck, lint, and the focused `tests/e2e/patient-portal.spec.ts` suite after applying the ZIP. The authoring environment does not contain the user's full repository or local database, so production typecheck, full unit/E2E suites, and Next.js build must be confirmed in the user's project.
