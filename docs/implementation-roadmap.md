# MERUNO Implementation Roadmap

This is the approved implementation sequence for the MERUNO single-branch outpatient-clinic portfolio project. It contains 13 main phases numbered 0–12 and three delivery parts. Phase 3 is split into smaller implementation steps so authentication and authorization can be verified incrementally. A feature is not complete merely because it appears in a design reference or requirements document.

## Delivery parts

| Part | Included phases | Purpose | Current status |
| --- | --- | --- | --- |
| Part 1 — Project foundation | Phase 0 and Phase 1 (Steps 1–9) | Project contract, technical setup, visual foundation, public shell, database health, validation, and test tooling | Complete |
| Part 2 — Domain database architecture | Phase 2A–2E | Clinic/patient domain schema, appointments/clinical schema, diagnostics, billing/operations, PostgreSQL integrity, migration, and synthetic seed foundation | Complete in implementation; the developer's local migration status remains the source of truth |
| Part 3 — Authentication and authorization | Phase 3A onward | Login identity, employee/patient linking, role permissions, delegated access, protected server operations, and account lifecycle | Complete — Phases 3A–3F and 3G-A through 3G-C are locally verified |

## Status summary

The developer confirmed Update 22 Fix 01 passed all five local checks and closed Phase 3E. Update 23 passed all five checks (35 unit tests and 6 E2E tests), closing Phase 3F. Update 24 and Fix 01 passed all five checks (41 unit tests and 11 E2E tests), closing Phase 3G-A. Update 25 and Fix 01 passed all five checks (51 unit tests and 14 E2E tests), closing Phase 3G-B1. Update 26 and Fix 03 passed all five local checks (64 unit tests and 17 E2E tests), closing Phase 3G-B2. Update 27 passed all five local checks (86 unit tests and 22 E2E tests), closing Phase 3G-C. Update 28 and Fix 01 were applied; the developer confirmed three migrations were applied and up to date, and all five local checks passed (89 unit tests and 22 E2E tests), closing Phase 4A. Update 29 then completed Phase 4B1; the developer confirmed four migrations are applied and up to date, and all five local checks passed (98 unit tests and 22 E2E tests). Update 30 completed Phase 4B2; the developer confirmed five migrations are applied and up to date, with 107 unit tests, 22 E2E tests, typecheck, lint, and production build passing. Update 31 and Fix 01 completed Phase 4C; the developer confirmed 131 unit tests, 24 E2E tests, typecheck, lint, and production build passed. Update 32 is the current Phase 4D diagnostic master-data administration package; it reuses existing models and awaits local verification.

| Phase | Name | Current status |
| --- | --- | --- |
| 0 | Planning and technical direction | Complete |
| 1 | Project foundation | Complete; all nine steps implemented and locally verified |
| 2A | Master data and patient foundation | Complete; 11 models implemented and hardened |
| 2B | Appointments and clinical records | Complete; 13 models added and locally validated |
| 2C | Laboratory and radiology | Complete; 21 models added and locally validated |
| 2D | Billing and operations | Complete; 12 models added and locally validated |
| 2E | Migrations and synthetic seed data | Schema, migration-preview generator, PostgreSQL integrity rules, and synthetic seed workflow finalized through Updates 11–13. Check `npx prisma migrate status` against the developer's local database before any further migration work; never reset or drop it as a shortcut. |
| 3A | Authentication and authorization schema | Complete — Updates 14–15 |
| 3B | Better Auth integration | Complete — Update 16 and local build/HTTPS corrections in Update 17 |
| 3C | Sign-in, sign-out, and initial System Admin bootstrap | Complete — Update 18; the auth E2E setup was corrected in Updates 19–20 |
| 3D | Existing employee/patient account linking | Complete — Update 21; developer reported E2E success after the server-port conflict was resolved |
| 3E | Authorization core: actor resolution, role/permission matrix, and patient delegation scope checks | Complete — Update 22 and Fix 01; all five local checks passed |
| 3F | Protected route/workspace policies and authenticated domain data-access integration | Complete — Update 23; developer confirmed all five local checks passed |
| 3G-A | Patient registration, email verification, password reset, and password change | Complete — Update 24 and Fix 01; developer confirmed all five local checks passed (41 unit, 11 E2E) |
| 3G-B1 | Verified email change and linked-record synchronization | Complete — Update 25 and Fix 01; all five local checks passed (51 unit, 14 E2E) |
| 3G-B2 | Controlled employee invitations | Complete — Update 26 and Fixes 01–03; developer confirmed all five checks passed (64 unit, 17 E2E) |
| 3G-C | Guardian/adult delegation management | Complete — Update 27; developer confirmed 86 unit tests, 22 E2E tests, typecheck, lint, and production build passed |
| 4A | Consultation-room schema and appointment resource integrity | Complete — Update 28 and Fix 01; developer confirmed three migrations up to date and all five local checks passed (89 unit, 22 E2E) |
| 4B1 | Clinic weekly working hours and local-time foundation | Complete — Update 29; developer confirmed four migrations up to date and all five local checks passed (98 unit, 22 E2E) |
| 4B2 | Doctor weekly schedule and clinic-hours integrity | Complete — Update 30; developer confirmed five migrations up to date and all five checks passed (107 unit, 22 E2E) |
| 4C | Specialty, doctor profile, service, duration, and EGP price administration | Complete — Update 31 and Fix 01; 131 unit, 24 E2E, typecheck, lint, and build passed |
| 4D | Laboratory and digital X-ray/ultrasound catalog/resource administration | Current update — Update 32; local verification pending; no schema migration |
| 5 | Patient management workflows | Not started |
| 6 | Appointments and reception workflows | Not started |
| 7 | Doctor and nurse workspaces | Not started |
| 8 | Laboratory and radiology workflows | Not started |
| 9 | Billing and payments | Not started |
| 10 | Complete public website and patient portal | Only the Phase 1 public shell exists; complete pages and portal workflows are pending |
| 11 | Clinic management and system administration | Not started |
| 12 | Integrated testing and release | Not started |

## Phase 0 — Planning and technical direction

**Status: complete.**

Approved the single-branch polyclinic scope, the stack, the security and privacy boundaries, the role model, the business workflows, the visual direction, and the dependency-oriented implementation order.

## Phase 1 — Project foundation

**Status: complete.** The developer confirmed all nine steps and the local verification suite.

| Step | Work | Status |
| --- | --- | --- |
| 1 | Project contract and documentation (`AGENTS.md`, `README.md`, architecture) | Implemented; README alignment is included in the current documentation update |
| 2 | Environment template, ignore rules, Node/package hygiene | Implemented |
| 3 | Tooling scripts and ESLint boundaries | Implemented |
| 4 | shadcn/ui initialization with Base UI and six shared primitives | Implemented |
| 5 | MERUNO tokens, local Inter Variable, root layout, wordmark | Implemented |
| 6 | Public application shell, homepage preview, header/footer, loading/error/404 states | Implemented |
| 7 | Server environment validation, Prisma Client singleton, database health service and route | Implemented; local `/api/health` smoke test returned HTTP 200, database `ok`, and `Cache-Control: no-store` |
| 8 | Shared validation foundation for future application inputs | Implemented in Update 03: shared async Zod 4 validation helper and usage/security guidance |
| 9 | Testing foundation: Vitest unit tests and Playwright browser E2E | Implemented and locally verified: 4 Vitest tests and 3 Playwright tests passed. ESLint, TypeScript, Prisma validation, and production build also passed. CI remains deferred until the deployment/repository provider is confirmed. |

Phase 1 files establish the visual and technical shell. The homepage preview is illustrative only, and no patient or clinical workflows are implemented. Step 8 adds reusable validation infrastructure; the first domain schema models were introduced separately in Phase 2A.

## Phase 2 — Domain database architecture

**Status: implementation complete through Update 13.** The schema defines the entities and relations for master data, patients, appointments, clinical records, laboratory, radiology, billing, and operations. Phase 2E finalized the initial migration generator, PostgreSQL-only constraints, and synthetic catalog seed. The developer's current PostgreSQL migration/seed state must be checked locally with `npx prisma migrate status`; do not infer it from schema validation alone, and never reset or drop the connected database to resolve an issue.

### Phase 2A — Master data and patient foundation

Initial models implemented in Update 06:

- `Specialty`, `Employee`, `DoctorProfile`, and `DoctorSpecialty`.
- `ServiceCatalog` and `DoctorService`.
- `DoctorWeeklySchedule` and `DoctorScheduleException`.
- `Patient`, `PatientContact`, and `PatientRelationship`.

Update 07 refines the patient gender field, separates a family relationship from a legal-guardian designation, records which employee verified a legal guardian, and documents PostgreSQL-only constraints required in the first migration. The developer confirmed `db:validate`, `db:generate`, `typecheck`, `lint`, `npm test` (4/4), `test:e2e` (3/3), and `build` all passed after applying Update 07.

**Phase 2A status:** schema design and hardening completed in Updates 06–07. PostgreSQL-only constraints were handled in Phase 2E.

### Phase 2B — Appointments and clinical records

Update 08 adds `Appointment`, `AppointmentStatusHistory`, `QueueEntry`, `IdentityVerification`, `Encounter`, `ClinicalNote`, `VitalSign`, `DiagnosisCatalog`, `EncounterDiagnosis`, `Prescription`, `PrescriptionItem`, `ClinicalAmendment`, and `Referral`. The developer confirmed `db:validate`, `db:generate`, `typecheck`, `lint`, unit tests (4/4), E2E tests (3/3), and production build passed. Database-level concurrency safeguards were handled in Phase 2E. A valid schema alone is not evidence of safe concurrent booking.

### Phase 2C — Laboratory and radiology

Update 09 adds 21 models: `LabTest`, `LabTestComponent`, `LabOrder`, `LabOrderItem`, `LabSample`, `LabSampleItem`, `LabResult`, `LabResultValue`, `LabResultReview`, `LabClinicalReview`, `LabCriticalCommunication`, `RadiologyProcedure`, `RadiologyResource`, `RadiologyOrder`, `RadiologyOrderItem`, `RadiologyExam`, `RadiologyPregnancyScreening`, `RadiologyReport`, `RadiologyReportReview`, `RadiologyClinicalReview`, and `RadiologyCriticalCommunication`. The developer confirmed all seven local checks passed: Prisma validation, generation, lint, typecheck, 4 unit tests, 3 E2E tests, and production build. No migration or database write is included.

Laboratory workflow: order → sample collection → receive/accept/reject → processing → result entry → laboratory approval → release → clinician review. Critical results require read-back, acknowledgment, and escalation.

Radiology workflow: order → schedule/resource allocation → identity/preparation → pregnancy screening before X-ray when clinically applicable → examination → report draft → radiologist approval → release → ordering-clinician review. Only digital X-ray and ultrasound are supported. Resource conflict constraints and result-value/timestamp checks are added to the Phase 2E custom migration SQL.

### Phase 2D — Billing and operations

Update 10 adds 12 models: `Invoice`, `InvoiceItem`, `Payment`, `DiscountApproval`, `Refund`, `RefundItem`, `Complaint`, `ComplaintEvent`, `IncidentReport`, `Attachment`, `Notification`, and `AuditLog`. It adds multi-item invoices tied to encounters, full-only payment records, approval records for discounts/refunds, item-level refunds, complaint intake/history, confidential incident records, attachment metadata, patient/employee notifications, and minimal audit metadata.

The schema is not enforcement by itself. Phase 2E adds a partial unique index allowing at most one completed payment per invoice; CHECK constraints for positive amounts/quantities and monetary reconciliation; source exclusivity for invoice items; attachment ownership/size rules; exactly one notification recipient; and exclusion constraints for overlapping active appointments, doctor weekly schedules, and scheduled radiology resources. Deferred PostgreSQL triggers reconcile invoice totals, verify invoice/encounter patient identity, require exact full payment in the invoice currency, reconcile paid/refunded invoice states, and protect refund-to-invoice ownership and refund caps at item and invoice level. Further triggers enforce radiology resource/procedure modality compatibility. Discount request history allows repeated requests but only one pending request at a time. Audit logs restrict employee deletion. Application transactions must still enforce manager approval and separation of duties, invoice only after service completion, maintain invoice statuses after payment/refund, and keep result-ready notifications free of medical details. Authorization is handled in Phase 3.

**Phase 2D status:** schema design and local validation completed in Update 10; the PostgreSQL integrity layer was finalized in Phase 2E.

### Phase 2E — Migration and seed verification

Update 11 adds:

- A local script that renders the initial SQL migration from an empty schema to the current Prisma schema using Prisma 7 `migrate diff`, then appends custom PostgreSQL constraints and deferred integrity triggers.
- Billing schema hardening: repeatable discount request history with one pending request per invoice; exact full-payment amount/currency validation; invoice line reconciliation; patient/encounter matching; refund item ownership, sum reconciliation, and outstanding-balance caps; and audit-log employee delete restriction.
- Scheduling/radiology hardening: no overlapping active weekly schedules for the same doctor; complete room/time requirements for active radiology exams; and modality compatibility between the requested procedure and assigned resource.
- A migration lock file (`provider = "postgresql"`) generated by the preview script if absent.
- An idempotent SQL seed for seven specialties, eight synthetic doctors, consultation/follow-up services, eight lab tests and selected components, demo-labeled diagnoses, four X-ray/ultrasound procedures, and two radiology resources. No patient records or real identities are seeded.
- `db:migration:preview`, `db:migrate:status`, and `db:seed` scripts.

**Current status:** Updates 11–13 finalized the initial migration-preview generator, reviewed the integrity rules, and prepared the synthetic catalog seed. The local database has subsequently been used by the Phase 3 authentication/bootstrap work, so do not regenerate or replace its migration history. Use `npx prisma migrate status` to confirm the exact local state before any new migration. Run the idempotent seed only when the documented local migration state indicates it is needed. Never use `db push`, `migrate reset`, or a destructive shortcut to reconcile an existing database.

## Phase 3 — Authentication and authorization

**Status: complete.** Phases 3A–3F and 3G-A through 3G-C are implemented and locally verified. Better Auth is installed and integrated. Authentication and authorization remain server-enforced; a hidden button or client-supplied role is never an authorization boundary.

### Phase 3A — Authentication and authorization schema (Updates 14–15)

- Better Auth identity tables: `User`, `Session`, `Account`, and `Verification`.
- Explicit one-to-one `EmployeeAccount` and `PatientAccount` links.
- Database-backed `EmployeeRoleAssignment` rows.
- Patient delegation through `PatientAccessGrant` and explicit `PatientAccessGrantPermission` scopes.
- No email-match-only account linking and no public employee sign-up.

### Phase 3B — Better Auth integration (Update 16; corrections in Update 17)

- Server-only Better Auth instance using the existing Prisma 7 client.
- Next.js catch-all auth handler, browser auth client, validated session helper, and environment validation.
- Public sign-up remains disabled until verified patient registration and account-linking workflows exist.

### Phase 3C — Sign-in, sign-out, and initial System Admin bootstrap (Update 18; E2E fixes in Updates 19–20)

- Login form, sign-out action, and an account-status page.
- One-time local-only System Admin bootstrap, restricted to local PostgreSQL and protected against a second bootstrap.
- The account-status page confirms identity links and active roles; it does not itself grant access to a workspace or medical record.

### Phase 3D — Existing account linking (Update 21)

- System Admin links a verified Better Auth identity to an existing active Employee with matching work email.
- Reception or System Admin links a verified identity to an existing Patient only after two distinct supported identifiers match.
- Link operations are audited; failed patient identity checks do not persist submitted identifier values.
- No account-linking UI or general record access is introduced in this step.

### Phase 3E — Authorization core (Update 22; Fix 01)

**Status: complete and locally verified.**

- Resolve the active Better Auth session to verified, active Employee and/or Patient identities using database links.
- Maintain a least-privilege role-to-permission matrix; System Admin and Clinic Manager remain separate.
- Provide server guards for active employee role/permission and verified patient identity.
- Enforce patient self-access and explicit delegated patient access by exact scope, grant status, expiry, revocation, employee verification, and minor-guardian/adult-approval rules.
- Make the existing account-linking endpoints use the shared permission matrix.
- Developer confirmed typecheck, lint, 24/24 unit tests, 6/6 E2E tests, and production build passed after the actor null-safety fix.

### Phase 3F — Protected routes and authenticated data access (Update 23)

**Status: complete and locally verified.** The developer confirmed typecheck, lint, 35 unit tests, 6 E2E tests, and production build passed.

- Add server-side Route Handler wrappers for operation-specific employee permissions, employee workspaces, verified patient portal identity, and exact-scope patient-record access.
- Define a workspace-entry policy for Reception, Doctor, Nurse, Laboratory, Radiology, Cashier, Clinic Manager, and System Admin. Workspace entry is only a shell-level check; each operation must still enforce its own permission and resource rules.
- Add reusable server-only data-access wrappers that resolve an employee permission or patient record scope before invoking a domain query/mutation callback.
- Migrate the existing employee/patient account-linking Route Handlers to the common employee permission guard instead of repeating session/role lookup logic.
- Add workspace-policy unit coverage. Domain-specific assignment, record-state, and separation-of-duties checks remain the responsibility of the data service introduced with each workflow phase; do not imply that this foundation already implements those domain rules.
- Domain data services must return minimal DTOs, not raw Prisma records. Never rely on middleware or client-side visibility as the security boundary.

### Phase 3G — Account lifecycle and delegation operations (in progress)

Phase 3G is split into smaller verified updates so public sign-up, employee provisioning, email changes, and patient delegation are not opened together.

#### Phase 3G-A — Patient sign-up, email verification, and password recovery (Update 24)

- Enable public patient sign-in registration only when a transactional email transport is available.
- Require verified email before a Better Auth session can be created; do not automatically sign in after registration.
- Public registration creates only Better Auth `User` and credential `Account` rows. It does not create a clinic `Patient`, `Employee`, `PatientAccount`, `EmployeeAccount`, or employee role assignment.
- The new auth identity remains unable to access patient records until authorized Reception/System Admin staff link it to an existing active Patient using the Phase 3D two-identifier verification flow.
- Add password reset delivery and a reset screen. Successful reset revokes other active sessions.
- Add authenticated password changes requiring the current password and revoking other sessions.
- Use a local console email transport only in non-production development. Production registration remains disabled until Resend sender credentials and a verified sender address are configured.

#### Phase 3G-B1 — Verified email change (Update 25)

- Require approval through the current email address and verification through the new address.
- Check uniqueness across Better Auth users, employee work emails, and patient email contacts.
- In one serializable transaction, synchronize `User.email`, a linked `Employee.workEmail`, and a linked patient `PatientContact` email.
- Write a minimal audit event and revoke all active sessions after completion.
- Reuse the existing `Verification` table; no new schema or migration is introduced.
- Update 25 Fix 01 adjusts only the authentication-entry E2E tests: it waits for DOM readiness and clears cookies before verifying the signed-out account-status redirect. The developer confirmed all five validation commands passed after this fix (51 unit tests and 14 E2E tests).

#### Phase 3G-B2 — Controlled employee invitations (Update 26)

**Status: complete; the developer confirmed all five local checks passed after Update 26 Fix 03 (64 unit tests and 17 E2E tests).**

- System Admin only may issue, resend, or revoke an invitation for an existing active Employee with a valid work email, using the existing `employee.account.link` permission.
- A new invitation replaces the prior pending invitation for that employee and expires after 72 hours. The one-time token is generated with cryptographic randomness; only its SHA-256 digest is stored in the existing Better Auth `Verification` table.
- The invitee creates or uses a Better Auth identity with the exact invited work email, verifies that email, signs in, and explicitly accepts the invitation. The server rechecks the database email and verification state before linking.
- Acceptance creates only `EmployeeAccount`, records the inviter in `linkedByEmployeeId`, and writes an audit event. It does not create an Employee or grant, change, or infer any role assignment. Existing employee status and the current work email are rechecked at acceptance.
- Issuance, delivery failure, revocation, and acceptance are audited. Same-origin checks protect mutation routes; invitation GET requests never perform acceptance.
- No Prisma schema change, migration, Prisma Client generation, new dependency, or environment variable is introduced; email uses the existing console (non-production) / Resend transport.
- Update 26 Fixes 01–03 align the Playwright environment and request Origin with `BETTER_AUTH_URL`, load `@next/env` using Node `createRequire`, and wait for `/login` during web-server readiness. The developer then confirmed all five local checks passed, including 64/64 unit and 17/17 E2E tests.
- The future System Admin workspace may consume the invitation APIs in Phase 11; this update provides the server endpoints and secure acceptance page, not a full employee-administration workspace.

#### Phase 3G-C — Guardian/adult delegation management (Update 27; complete and locally verified)

- Add a dedicated `patient.delegation.manage` permission for Reception and System Admin only. It does not grant either role clinical-record access.
- Reception/System Admin can list grants for a subject patient, create a grant for an existing directed `PatientRelationship`, replace exact scopes/expiry, and revoke pending or active grants.
- A delegate must have an active, verified PatientAccount. Adult subjects must also have an active, verified PatientAccount so they can provide explicit approval.
- A grant for a minor activates only when the relationship is marked as a legal guardian and both guardian-verification fields are present. A missing date of birth or missing guardian verification fails closed.
- A grant for an adult starts `PENDING`. Only the authenticated subject patient can approve or reject it. Staff changes to an adult grant's scopes or expiry clear the previous approval and return the grant to `PENDING`.
- Subject patients can view outgoing/incoming grants and revoke their own pending or active outgoing grants. A delegate cannot approve or revoke a grant on behalf of the subject.
- Every new request, reissue, scope/expiry update, approval, rejection, and revocation writes an AuditLog event. Grant expiry is finite (future, no more than 365 days); the Phase 3E access policy denies access at the exact expiry time even if the stored status has not yet been normalized.
- The implementation reuses `PatientAccessGrant`, `PatientAccessGrantPermission`, `PatientRelationship`, `PatientAccount`, and `AuditLog`. No Prisma schema change, migration, seed, new dependency, or environment variable is required.
- This update delivers the secure server API and minimal DTOs. Patient portal screens belong to Phase 10; Reception/System Admin workspace screens belong to Phase 11.

Approved employee role groups are Reception, Doctor, Nurse, Lab Staff, Radiology Staff, Radiologist, Cashier, Clinic Manager, and System Admin. Patient and Guardian/Delegate access is modeled separately. Every employee role is sourced from active database assignments; patient access is sourced from explicit account links and scoped grants.

## Phase 4 — Clinic setup and master data

Build controlled clinic master data for the single branch: seven specialties, eight doctors, services, prices, availability schedules, consultation rooms, and the permitted laboratory/radiology resources. Radiology is limited to digital X-ray and ultrasound. Avoid multi-branch abstractions and unsupported equipment types.

### Phase 4A — Consultation-room database foundation (Update 28 + Fix 01)

**Status: complete; the developer confirmed three migrations are applied and up to date, and all five local checks passed (89 unit tests and 22 E2E tests).**

- Add a dedicated `ConsultationRoom` model, separate from `RadiologyResource`.
- Add nullable `Appointment.consultationRoomId`; existing appointments remain valid and unassigned.
- PostgreSQL prevents overlapping active appointments from occupying the same consultation room.
- Consultation rooms are deactivated rather than physically deleted once referenced by appointments.
- No room count was invented or seeded. Room configuration screens belong to Phase 11 and booking assignment belongs to Phase 6.

### Phase 4B1 — Clinic weekly working hours and local-time foundation (Update 29)

**Status: complete; the developer confirmed four migrations are applied and up to date, and all five local checks passed (98 unit tests and 22 E2E tests).**

- Add `ClinicWeeklySchedule` for the single clinic's weekly opening intervals. Multiple split shifts per weekday are permitted; overlapping active intervals for intersecting effective dates are rejected in PostgreSQL.
- Add `ClinicScheduleException` for one-off `BLOCKED` closure intervals and explicit `EXTRA_HOURS` openings, reusing the existing `ScheduleExceptionType` enum.
- Clinic exceptions use `timestamptz`, require end after start, cannot overlap another exception, and retain an optional employee creator reference.
- Centralize clinic wall-clock conversion in `src/lib/clinic-time.ts` using the `Africa/Cairo` IANA time zone. Weekly rows use minutes after midnight in clinic local time; exceptions are stored as instants.
- Retain `DoctorWeeklySchedule` and `DoctorScheduleException` unchanged. Their minute/date checks and doctor weekly overlap protection already exist in Phase 2E; no individual doctor hours are invented or seeded.
- No clinic opening hours, holidays, weekly doctor shifts, or exceptions are seeded. An absent active weekly row means the day has no configured opening interval.
- This is a data foundation only. Management screens and audit workflows belong to Phase 11; appointment slot generation must combine clinic hours, doctor schedules/exceptions, service duration, room availability, and existing appointment constraints in Phase 6.
- The migration inserts no data and does not rewrite prior schedule or appointment records.

### Phase 4B2 — Doctor schedule and clinic-hours integrity (Update 30)

**Status: complete; the developer confirmed five migrations are applied and up to date, and all five local checks passed (107 unit tests and 22 E2E tests).**

- Reuse the existing `DoctorWeeklySchedule` and `DoctorScheduleException` models. No duplicate scheduling tables or new Prisma models are introduced.
- An active doctor weekly interval must fit completely inside one active `ClinicWeeklySchedule` interval with the same weekday. Its clinic effective-date range must cover the doctor's complete effective-date range; schedule rows must be segmented when clinic opening-hour configurations change over time.
- Doctor `EXTRA_HOURS` exceptions must fit within regular clinic hours or a containing clinic `EXTRA_HOURS` exception, using `Africa/Cairo` local time for weekly intervals. A clinic `BLOCKED` exception takes precedence.
- Prevent overlapping one-off exceptions for the same doctor.
- Deferred PostgreSQL constraint triggers revalidate all active doctor schedules and doctor extra-hours exceptions when clinic weekly hours or clinic exceptions are changed. This permits related changes to be committed atomically.
- The migration performs a read-only preflight and fails safely if existing doctor schedule rows do not meet the new rules. It does not rewrite or seed schedule data.
- No schedule management UI/API or appointment slot generation is added here. Manager configuration screens belong to Phase 11; appointment availability combines these schedules with services, rooms, exceptions, and existing bookings in Phase 6.

### Phase 4C — Specialty, doctor profile, and consultation-service administration (Update 31 + Fix 01)

**Status: complete; the developer confirmed 131 unit tests, 24 E2E tests, typecheck, lint, and production build passed.**

- Add the operation-specific `clinic.master-data.manage` permission for Clinic Manager and System Admin only. Reception, doctors, nurses, diagnostic staff, and Cashier do not receive this permission.
- Add staff-only master-data listing and a separate public clinic catalog DTO. The public API returns only explicitly visible profiles, active specialties, and active doctor-service offerings; employee IDs, employee numbers, email addresses, and phone numbers are never exposed.
- Support controlled updates to the seven existing specialties; specialties are not created or physically deleted in this step.
- Support doctor public-profile maintenance and complete specialty-assignment replacement with exactly one primary specialty. A doctor cannot be made bookable unless the employee is active and the doctor has at least one active specialty and one active service offering.
- Support service-catalog creation/update/deactivation and per-doctor consultation/follow-up duration and EGP price maintenance. Service codes and types are immutable after creation; inactive records are retained for historical references.
- Every mutation is same-origin protected and recorded in `AuditLog` in the same database transaction. Price changes do not rewrite an appointment's `bookedPrice` snapshot.
- Reuse existing `Specialty`, `DoctorProfile`, `DoctorSpecialty`, `ServiceCatalog`, `DoctorService`, `Employee`, `Appointment`, and `AuditLog` records. No Prisma schema change, migration, seed, dependency, or environment variable is required.
- This update provides APIs and minimal DTOs only. Management screens remain in Phase 11; slot generation and booking integration remain in Phase 6.

### Phase 4D — Laboratory and radiology catalog/resource administration (Update 32)

**Status: implementation package prepared; local verification pending.**

- Reuse existing `LabTest`, `LabTestComponent`, `RadiologyProcedure`, `RadiologyResource`, and `AuditLog` models. The existing synthetic catalog already contains eight laboratory tests with selected components, four X-ray/ultrasound procedures, and two radiology resources; this update does not rerun or alter the seed.
- Add protected staff listing and create/update/soft-deactivation APIs for laboratory tests and components, radiology procedures, and radiology resources.
- Use the existing `clinic.master-data.manage` permission, granted only to Clinic Manager and System Admin. Do not grant diagnostic catalog administration to Reception or diagnostic staff.
- Enforce EGP prices with two decimal places, bounded turnaround/duration, strict catalog codes, and soft deactivation. Existing order item price snapshots remain unchanged after catalog price updates.
- Keep lab component code/value type and radiology procedure/resource modalities immutable after creation so historical snapshots and procedure/resource compatibility remain stable.
- Radiology modality remains limited to digital X-ray and ultrasound. Do not add CT, MRI, mammography, echocardiography, PACS, DICOM, or device integrations.
- Do not deactivate a radiology resource while it has scheduled or in-progress exams. Every catalog mutation and its AuditLog event commit atomically.
- The staff DTO includes diagnostic catalog metadata only; it never returns diagnostic orders, samples, patient data, result values, or reports.
- No schema change, migration, seed change, Prisma Client generation, dependency, or environment variable is required.
- This is API/data-layer work only. Diagnostic operational workflows belong to Phase 8; management screens belong to Phase 11; public diagnostic catalog exposure belongs to Phase 10 after explicit public-content review.

### Remaining Phase 4 work

No additional master-data subphase remains after 4D. Phase 5 begins patient management workflows. Room and staff workspace screens remain scheduled for Phase 11, while appointment availability and booking integration remain scheduled for Phase 6.

## Phase 5 — Patient management

Implement patient records and unique MRNs, duplicate detection before creation, identity verification using at least two elements, contact details, consent records, attachments, guardian relationships for minors, and explicit adult delegation. Delegation is scoped and revocable; booking authority does not automatically grant access to medical records. Patient data access is limited to the patient's own data or explicitly authorized delegation.

## Phase 6 — Appointments and reception

Implement the approved booking flow: specialty → doctor → date/time → patient details/review → confirmation. Prevent doctor/patient overlap and overbooking, including concurrent requests. Support guest booking by phone without OTP and account booking with verified email. Guardians may book for children under the approved rules.

Reception supports check-in, queue management, and walk-ins. Walk-ins must not displace confirmed appointments. Patients may self-cancel or reschedule at least 24 hours before the appointment; later changes go through reception. Arrival target is 15 minutes early, with a 10-minute grace period and no automatic cancellation solely for lateness.

## Phase 7 — Doctor and nurse workspaces

Implement encounter-per-visit workflows. Doctors control diagnoses, treatment plans, prescriptions, laboratory/radiology orders, referrals, and follow-up. Doctors draft and approve encounters. Approved records cannot be silently overwritten or deleted; corrections preserve the previous value, reason, actor, and timestamp.

Nurses record vitals and assigned tasks and escalate concerns to a doctor. Nurses do not independently diagnose or prescribe.

## Phase 8 — Laboratory and radiology

**Laboratory:** order → patient/sample identity check → collection → receive/accept/reject → processing → result entry → review/approval → release. Critical results require notification, read-back, acknowledgment, and escalation. External laboratory referrals and external patients are included only within the approved medium-clinic requirements and must not turn this into a separate laboratory SaaS.

**Radiology:** order → scheduling → identity/preparation → pregnancy screening before X-ray → examination → report draft → radiologist approval → release. Prevent room/equipment conflicts. Only digital X-ray and ultrasound are in scope. Do not add CT, MRI, mammography, echocardiography, PACS, or DICOM integration.

## Phase 9 — Billing and payments

Support multi-item invoices and full payment only after service. Accepted methods: cash, POS card, and clinic-supported electronic wallets. No online payment gateway, installments, partial payments, or insurance claims.

Discounts require authorized manager approval and a recorded reason. Refunds require manager approval. An unprovided item in a multi-item invoice may be refunded without cancelling other items. Preserve the original invoice and record refund details; never delete or silently overwrite an issued invoice.

## Phase 10 — Public website and patient portal

Expand the Phase 1 shell into the complete public clinic website and patient-facing portal using the approved design boards and MERUNO identity. Implement public specialty/doctor/service information and the approved booking entry flow. The patient portal exposes only authenticated, authorized patient data and approved documents. Do not invent public contact details, addresses, or medical claims.

## Phase 11 — Clinic management and system administration

Build distinct Clinic Manager and System Admin workspaces. Include role-scoped operational controls, staff/master-data administration, audit visibility, reporting, and approval workflows. Reception must not gain medical-record access. Manager authority does not imply unrestricted platform-level System Admin privileges.

Approved operational reporting includes appointment/cancellation/no-show metrics, patient and visit counts, doctor performance, lab/radiology turnaround and pending results, revenue, waiting times, complaints, and results awaiting review. Exports are limited by role.

Complaints may be submitted online or recorded by reception from verbal/phone reports; provide a reference number. One-business-day acknowledgment and five-business-day closure are operational targets, not guarantees. Incidents are confidential. Emergency handling is limited to urgent assessment/referral/ambulance transfer, not an emergency department.

Notifications are in-app, with browser push where supported and consented. Booking confirmation/reminder may use email when valid. Result-ready messages must not expose medical details. Paid SMS/WhatsApp is out of scope.

## Phase 12 — Integrated testing and release

Validate the complete system across roles, workflows, permissions, concurrency, privacy, and responsive behavior. Run unit and browser end-to-end tests, migration/seed verification, security checks, and appropriate local load tests. Confirm deployment configuration and environment variables without exposing secrets. Prepare the portfolio demo with synthetic data only and document known limitations. Do not describe the application as a production clinical system.

## Global constraints

- One branch; Arabic and English UI; RTL/LTR layout support; Light theme.
- Single Next.js modular monolith, PostgreSQL, Prisma 7, Tailwind CSS 4/Turbopack, shadcn with Base UI, and local Inter Variable.
- Keep database access in server-only modules. Add the authenticated data access layer only in Phase 3.
- No real patient data. Demo/seed records must be synthetic.
- No online payment gateways, installments, insurance claims, pharmacy inventory, inpatient care, emergency department, PACS/DICOM, telemedicine, or AI diagnosis.
- Design boards are visual references, not proof that the corresponding feature is implemented.
