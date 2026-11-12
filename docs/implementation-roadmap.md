# MERUNO Implementation Roadmap

This is the approved implementation sequence for the MERUNO single-branch outpatient-clinic portfolio project. It contains 13 main phases numbered 0–12 and three delivery parts. Phase 3 is split into smaller implementation steps so authentication and authorization can be verified incrementally. A feature is not complete merely because it appears in a design reference or requirements document.

## Delivery parts

| Part | Included phases | Purpose | Current status |
| --- | --- | --- | --- |
| Part 1 — Project foundation | Phase 0 and Phase 1 (Steps 1–9) | Project contract, technical setup, visual foundation, public shell, database health, validation, and test tooling | Complete |
| Part 2 — Domain database architecture | Phase 2A–2E | Clinic/patient domain schema, appointments/clinical schema, diagnostics, billing/operations, PostgreSQL integrity, migration, and synthetic seed foundation | Complete in implementation; the developer's local migration status remains the source of truth |
| Part 3 — Authentication and authorization | Phase 3A onward | Login identity, employee/patient linking, role permissions, delegated access, protected server operations, and account lifecycle | Complete — Phases 3A–3F and 3G-A through 3G-C are locally verified |

## Status summary

The developer confirmed Update 22 Fix 01 passed all five local checks and closed Phase 3E. Update 23 passed all five checks (35 unit tests and 6 E2E tests), closing Phase 3F. Update 24 and Fix 01 passed all five checks (41 unit tests and 11 E2E tests), closing Phase 3G-A. Update 25 and Fix 01 passed all five checks (51 unit tests and 14 E2E tests), closing Phase 3G-B1. Update 26 and Fix 03 passed all five local checks (64 unit tests and 17 E2E tests), closing Phase 3G-B2. Update 27 passed all five local checks (86 unit tests and 22 E2E tests), closing Phase 3G-C. Update 28 and Fix 01 were applied; the developer confirmed three migrations were applied and up to date, and all five local checks passed (89 unit tests and 22 E2E tests), closing Phase 4A. Update 29 then completed Phase 4B1; the developer confirmed four migrations are applied and up to date, and all five local checks passed (98 unit tests and 22 E2E tests). Update 30 completed Phase 4B2; the developer confirmed five migrations are applied and up to date, with 107 unit tests, 22 E2E tests, typecheck, lint, and production build passing. Update 31 and Fix 01 completed Phase 4C; the developer confirmed 131 unit tests, 24 E2E tests, typecheck, lint, and production build passed. Update 32 completed Phase 4D after the developer confirmed all five local checks passed (157 unit tests and 26 E2E tests). Update 33 and Fix 01 completed Phase 5A with 185 unit tests and 28 E2E tests. Update 34 completed Phase 5B with 204 unit tests and 29 E2E tests. Update 35 + Fix 01 completed Phase 5C patient contacts and consent history. The developer confirmed six migrations up to date, 259 unit tests, 33 E2E tests, typecheck, lint, and production build passed. Update 36 completed Phase 5D with protected patient administrative document APIs and private local development storage. Fix 01 removed the unintended Doctor document permission and made the path test platform-aware; Fix 02 corrected a role-selection assumption in the unit test without changing production policy. The developer confirmed all five checks passed: typecheck, lint, 287 unit tests, 36 E2E tests, and production build. Update 37 + Fix 01 completed Phase 5E-1 with directed family relationships and evidence-backed legal-guardian verification/revocation. The developer confirmed seven migrations up to date and passed all five checks: 307 unit tests, 40 E2E tests, typecheck, lint, and production build. Update 38 completed Phase 5E-2 with relationship correction, terminal soft deactivation, immutable deactivation history, linked-grant revocation, and active-relationship checks in delegated access/consent workflows. The developer applied migration 8 (`20261108050000_patient_relationship_lifecycle`), confirmed eight migrations up to date, and passed all five checks: 315 unit tests, 42 E2E tests, typecheck, lint, and production build. Phase 5E is closed. Update 39 completed Phase 6A with a read-only slot-availability calculation over existing clinic/doctor schedules and exceptions, service duration, booked appointments, and configured consultation rooms. The developer confirmed all five checks passed: 332 unit tests, 45 E2E tests, typecheck, lint, and production build. Update 40 completed Phase 6B1 authenticated patient-portal booking; the developer confirmed all five checks passed (356 unit tests and 46 E2E tests). Update 41 + Fix 01 completed Phase 6B2 public guest booking with a separate provisional contact record, one-time bearer management token hash, and database-enforced two-identifier Reception linking boundary. The developer applied migration 9 (`20261108060000_guest_appointment_identity`), confirmed nine migrations up to date, and passed all five checks: 378 unit tests, 49 E2E tests, typecheck, lint, and production build. Update 42 completed Phase 6B3A with 390 unit tests, 51 E2E tests, typecheck, lint, and production build passing. Update 43 completed Phase 6B3B: the developer confirmed 406 unit tests across 44 files, 53 E2E tests, typecheck, lint, and production build all passed. Update 44 completed Phase 6B3C: the developer applied migration 10 and confirmed all five local checks passed (425 unit tests, 53 E2E tests, typecheck, lint, and production build). Update 45 completed Phase 6C1 patient self-service cancellation; the developer confirmed 440 unit tests across 49 files, 55 E2E tests, typecheck, lint, and production build passed. Update 46 completed Phase 6C2 patient self-service rescheduling, limited to a new date/time for the same doctor and service while preserving the original duration and booked-price snapshot; the developer confirmed 458 unit tests across 51 files, 57 E2E tests, typecheck, lint, and production build passed. Update 47 completed Phase 6C3 guest self-service cancellation using the hashed bearer management token, the existing unresolved-guest boundary, an inclusive 24-hour rule, transactional token revocation, and an EXTERNAL audit event; the developer confirmed 475 unit tests across 53 files, 62 E2E tests, typecheck, lint, and production build passed. Update 48 completed Phase 6C4 guest self-service rescheduling with the same unresolved-guest bearer-token boundary, inclusive 24-hour rule, server-side slot/room revalidation, CONFIRMED-to-CONFIRMED lifecycle history, and EXTERNAL audit event; the developer confirmed 495 unit tests across 55 files, 66 E2E tests, typecheck, lint, and production build passed. Update 49 completed Phase 6C5 Reception cancellation and rescheduling for upcoming confirmed appointments, with active Reception permission rechecks, bounded reason codes, Patient/guest identity consistency, per-patient scheduling locks, slot/room revalidation, staff history and audit events; the developer confirmed 511 unit tests across 57 files, 70 E2E tests, typecheck, lint, and production build passed. Update 50 completed Phase 6D1 Reception check-in with two-element identity verification and atomic queue-entry creation; the developer confirmed 528 unit tests across 59 files, 72 E2E tests, typecheck, lint, and production build passed. Update 51 completed Phase 6D2 after the developer confirmed 538 unit tests across 60 files, 76 E2E tests, typecheck, lint, and production build passed. Update 52 completed Phase 6D3 existing-patient Walk-in registration. The developer confirmed all five checks passed: 561 unit tests across 62 files, 80 E2E tests, typecheck, lint, and production build. Update 53 completed Phase 6D4 explicit Reception no-show recording; the developer confirmed all five checks passed (587 unit tests across 64 files, 84 E2E tests, typecheck, lint, and production build). Update 54 completed Phase 7A with the Doctor-only current-day queue worklist API; the developer confirmed all five checks passed (593 unit tests across 65 files, 86 E2E tests, typecheck, lint, and production build). Update 55 completed Phase 7B: the developer confirmed all five checks passed (613 unit tests across 66 files, 89 E2E tests, typecheck, lint, and production build). Update 56 completed Phase 7C: the developer confirmed 640 unit tests across 68 files, 92 E2E tests, typecheck, lint, and production build passed. Update 57 + Fix 01 completed Phase 7D: the developer confirmed all five checks passed (669 unit tests across 70 files, 96 E2E tests, typecheck, lint, and production build). Update 58 completed Phase 7E after the developer confirmed migration 11 (`20261109110000_prescription_prn_safety_fields`) was applied and the database was up to date; all five checks passed (717 unit tests across 73 files, 101 E2E tests, typecheck, lint, and production build). Update 59 + Fix 01 completed Phase 7F: the developer confirmed 751 unit tests across 75 files, 105 E2E tests, typecheck, lint without warnings, and production build passed. Update 60 completed Phase 7G: Doctor-owned radiology catalogue search, Encounter order history, and immediate ORDERED requests with a persisted order-time X-ray screening decision. The developer confirmed migration 12 was applied and all five local checks passed (800 unit tests, 109 E2E tests, typecheck, lint, and production build). Update 61 completed Phase 7H Doctor referral creation/history; the developer confirmed all five checks passed (836 unit tests across 80 files, 112 E2E tests, typecheck, lint, and production build). Update 62 completed Phase 7I Doctor referral inbox/lifecycle actions after the developer confirmed all five checks passed (869 unit tests across 82 files, 116 E2E tests, typecheck, lint, and production build). Update 63 completed Phase 7J Doctor prescription issuance; the developer confirmed all five local checks passed (880 unit tests across 83 files, 120 E2E tests, typecheck, lint, and production build). Update 64 completed Phase 7K Doctor clinical-note signing; the developer confirmed all five local checks passed (901 unit tests across 85 files, 124 E2E tests, typecheck, lint, and production build). Update 65 introduces Phase 7L Doctor clinical-note amendments using the existing ClinicalAmendment model; local verification is pending.

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
| 4D | Laboratory and digital X-ray/ultrasound catalog/resource administration | Complete — Update 32; developer confirmed 157 unit tests, 26 E2E tests, typecheck, lint, and build passed |
| 5A | Patient registration and duplicate prevention | Complete — Update 33 + Fix 01; locally verified |
| 5B | Patient identity verification | Complete — Update 34; locally verified |
| 5C | Patient contacts, addresses, emergency contacts, and consent/refusal history | Complete — Update 35 + Fix 01; six migrations up to date and all five checks passed |
| 5D | Patient attachments and documents | Complete — Update 36 + Fixes 01–02; 287 unit, 36 E2E, typecheck, lint, and build passed |
| 5E | Family relationships and guardian workflows | Complete — Update 38; 8 migrations applied, 315 unit tests, 42 E2E tests, typecheck, lint, and production build passed |
| 6A | Public appointment availability foundation | Complete — Update 39; developer confirmed 332 unit tests and 45 E2E tests plus typecheck, lint, and build passed |
| 6B1 | Authenticated patient booking | Complete — Update 40; developer confirmed 356 unit tests, 46 E2E tests, typecheck, lint, and production build passed |
| 6B2 | Public guest appointment booking | Complete — Update 41 + Fix 01; migration 9 applied, nine migrations up to date, 378 unit tests, 49 E2E tests, typecheck, lint, and production build passed |
| 6B3A | Reception booking for existing patients | Complete — Update 42; developer confirmed 390 unit tests, 51 E2E tests, typecheck, lint, and production build passed |
| 6B3B | Guest appointment identity resolution | Complete — Update 43; developer confirmed 406 unit tests, 53 E2E tests, typecheck, lint, and production build passed |
| 6B3C | Audited same-patient overlap exception | Complete — Update 44; migration 10 applied, 425 unit tests, 53 E2E tests, typecheck, lint, and production build passed |
| 6C1 | Patient self-service cancellation | Complete — Update 45; developer confirmed 440 unit tests, 55 E2E tests, typecheck, lint, and production build passed |
| 6C2 | Patient self-service rescheduling | Complete — Update 46; developer confirmed 458 unit tests across 51 files, 57 E2E tests, typecheck, lint, and production build passed |
| 6C3 | Guest self-service cancellation | Complete — Update 47; developer confirmed 475 unit tests across 53 files, 62 E2E tests, typecheck, lint, and production build passed |
| 6C4 | Guest self-service rescheduling | Complete — Update 48; developer confirmed 495 unit tests across 55 files, 66 E2E tests, typecheck, lint, and production build passed |
| 6C5 | Reception appointment cancellation and rescheduling | Complete — Update 49; developer confirmed 511 unit tests, 70 E2E tests, typecheck, lint, and production build passed |
| 6D1 | Reception appointment check-in and queue entry | Complete — Update 50; developer confirmed 528 unit tests across 59 files, 72 E2E tests, typecheck, lint, and production build passed |
| 6D2 | Reception doctor queue board and Call Next | Complete — Update 51; developer confirmed 538 unit tests, 76 E2E tests, typecheck, lint, and production build passed |
| 6D3 | Walk-in registration | Complete — Update 52; 561 unit tests, 80 E2E tests, typecheck, lint, and production build passed |
| 6D4 | Reception no-show recording | Complete — Update 53; developer confirmed 587 unit tests, 84 E2E tests, typecheck, lint, and production build passed |
| 7A | Doctor current-day queue worklist | Complete — Update 54; developer confirmed 593 unit tests across 65 files, 86 E2E tests, typecheck, lint, and production build passed |
| 7B | Doctor starts consultation | Complete — Update 55; developer confirmed 613 unit tests across 66 files, 89 E2E tests, typecheck, lint, and production build passed |
| 7C | Doctor clinical-note draft | Complete — Update 56; developer confirmed 640 unit tests across 68 files, 92 E2E tests, typecheck, lint, and production build passed |
| 7D | Doctor Encounter diagnoses | Complete — Update 57 + Fix 01; developer confirmed 669 unit tests, 96 E2E tests, typecheck, lint, and production build passed |
| 7E | Doctor prescription drafts | Complete — Update 58; migration 11 applied and database up to date; 717 unit tests, 101 E2E tests, typecheck, lint, and production build passed |
| 7F | Doctor laboratory test orders | Complete — Update 59 + Fix 01; 751 unit tests across 75 files, 105 E2E tests, typecheck, clean lint, and production build passed |
| 7G | Doctor radiology orders | Complete — Update 60; developer confirmed migration 12 applied, 800 unit tests, 109 E2E tests, typecheck, lint, and production build passed |
| 7H | Doctor referral creation/history | Complete — Update 61; 836 unit tests across 80 files, 112 E2E tests, typecheck, lint, and production build passed |
| 7I | Doctor referral inbox/lifecycle | Complete — Update 62; 869 unit tests across 82 files, 116 E2E tests, typecheck, lint, and production build passed |
| 7J | Doctor prescription issuance | Complete — Update 63; developer confirmed 880 unit tests across 83 files, 120 E2E tests, typecheck, lint, and production build passed |
| 7K | Doctor clinical-note signing | Complete — Update 64; developer confirmed 901 unit tests across 85 files, 124 E2E tests, typecheck, lint, and production build passed |
| 7L | Doctor clinical-note amendments | Complete and locally verified — Update 65; 928 unit tests across 87 files, 128 E2E tests, typecheck, lint, and production build passed |
| 7M | Nursing task workflow, VitalSign recording, escalation, and Encounter completion | Current increment — Update 66; Migration 13 is required and local verification is pending |
| Phase 7 remaining | Prescription correction/version history, referral follow-up, Doctor/Nurse UIs, and complete cross-workspace UI integration | Planned |
| 8 | Laboratory and radiology workflows | Not started |
| 9 | Billing and payments | Update 71 Phase 9A locally verified; Update 72 Phase 9B prepared, local verification pending |
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

**Status: complete; the developer confirmed 157 unit tests, 26 E2E tests, typecheck, lint, and production build passed.**

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

### Phase 5A — Patient registration and duplicate prevention (Update 33 + Fix 01)

**Status: complete and locally verified after Update 33 Fix 01; the developer confirmed 185 unit tests and 28 E2E tests passed with typecheck, lint, and production build.**

- Reception creates patient records through the `patient.basic.manage` permission already assigned to Reception. This is not public self-registration and does not create a Better Auth identity or patient portal link.
- Generate a non-predictable unique MRN server-side; never accept an MRN from the registration request. Existing records are not rewritten.
- Run a duplicate search before create and repeat it inside a PostgreSQL Serializable transaction immediately before insert. Exact full name plus date of birth is a high-confidence match and blocks creation. Other single/ambiguous matches, especially a shared family phone, require explicit receptionist review and produce a dedicated AuditLog event.
- The duplicate DTO returns only the candidate's patient ID, MRN, name, date of birth, and which supported identity elements matched. It never returns contact values, appointments, encounters, diagnoses, orders, results, or billing data.
- Require two distinct identity elements at registration, including full name. The employee attests which elements were checked. `IdentityVerification` stores the element types and result only; national ID/passport/raw document values are not collected or logged.
- Store one primary phone contact and an optional primary email contact. Contact values remain unverified (`verifiedAt = null`) until a separate verification workflow exists. Shared contacts across family members remain allowed; contact fields are not made globally unique.
- Patient creation, identity verification, and audit events commit atomically. A serializable conflict returns a retry response; it never creates a partially registered patient.
- Reuse the existing `Patient`, `PatientContact`, `IdentityVerification`, and `AuditLog` models. No schema change, migration, seed, Prisma Client generation, dependency, or environment variable is required.
- This increment provides API/data-layer foundations only. Patient profile maintenance, consent, attachments, and guardian/family relationships remain later Phase 5 increments; portal screens remain in Phase 10 and receptionist workspace screens remain in Phase 11.

### Phase 5B — Existing patient identity verification (Update 34)

**Status: complete and locally verified after Update 34; the developer confirmed 204 unit tests, 29 E2E tests, typecheck, lint, and production build passed.**

- Add a reusable employee-only `patient.identity.verify` operation permission for Reception, Doctor, Nurse, Lab Staff, Radiology Staff, Radiologist, and Cashier. Clinic Manager and System Admin do not receive this patient-care operation permission.
- Add `POST /api/clinic/patients/{patientId}/identity-verifications`, guarded by an active, verified employee actor and the operation-specific permission.
- Require two distinct identifier types and require both to match the same active patient record. The supported comparison types are `FULL_NAME`, `DATE_OF_BIRTH`, `PHONE`, and `MRN`, because those are the identity fields represented by the current Patient/PatientContact models.
- Reuse the current name/date validation and Egyptian local/+20 phone match-key normalization. Phone alone is never sufficient; both submitted identifiers must match.
- Do not accept National ID, passport, email, or `OTHER` as comparison fields in this increment: the current Patient schema does not store those as identity fields, so accepting their values would imply a comparison the application cannot perform.
- Persist only the two identifier types, result (`VERIFIED` or `FAILED`), verifier employee, timestamp, and fixed non-sensitive notes in the existing `IdentityVerification` model. Submitted values are used in memory only and are never stored in IdentityVerification or AuditLog.
- Record both successful and failed attempts in the existing `AuditLog` with fixed reason text and no submitted values. A failed comparison returns a generic conflict response and does not identify which element failed.
- Reuse `Patient`, `PatientContact`, `IdentityVerification`, `AuditLog`, and the existing patient-management HTTP safeguards. No schema change, migration, seed, Prisma Client generation, dependency, or environment variable is required.
- This update provides a protected API/data-layer operation only. Appointment-linked verification and check-in belong to Phase 6; specimen and radiology identity workflows consume this operation in Phase 8; staff screens belong to Phase 11.

### Phase 5C — Patient contacts and consents (Update 35)

**Status: complete — Update 35 + Fix 01; the developer confirmed six migrations up to date, 259 unit tests, 33 E2E tests, typecheck, lint, and production build passed.**

- Maintain PHONE/EMAIL contact methods, postal addresses, and emergency contacts under the reception contact-management permission. Old values are deactivated, not deleted; primary switching is transactional.
- Add append-only consent events for privacy notice, personal-data processing, general treatment, and email/phone communication preferences. A new decision is a new row; the database blocks updates/deletes.
- Adult consent must be signed by the patient. Minor consent must be signed by a linked legal guardian whose relationship was verified by staff. The signer name is snapshotted from the stored patient identity, not supplied by the client.
- Record only event metadata in AuditLog; do not write contact values, addresses, emergency-contact names, or submitted identifiers into audit reasons.
- The update added the sixth migration after the five already confirmed by the developer. The developer confirmed all six are applied and the database is up to date. Existing contacts become active by default; no existing value is rewritten or reseeded.
- The initial local checks found an email-normalization/unit-test typing issue; Fix 01 corrected both. The developer then confirmed the complete five-command validation sequence passed: typecheck, lint, 259 unit tests, 33 E2E tests, and production build. No database change was part of Fix 01.
- Procedure-specific consent and patient-portal capture remain in their owning later workflows.

### Phase 5D — Patient attachments and documents (Update 36)

**Status: complete — Update 36 + Fixes 01–02; the developer confirmed 287 unit tests, 36 E2E tests, typecheck, lint, and production build passed.**

- Reuse the existing `Attachment` model and `PATIENT_DOCUMENT` purpose. No Prisma schema change, migration, Prisma Client generation, seed, dependency, package script, or environment variable is required.
- Add Reception-only `patient.document.read` and `patient.document.upload` permissions. `patient.basic.read` does not imply access. System Admin, Doctor, and all other roles receive no patient-document access in this increment. Fix 01 removes an unintended Doctor grant caught by the role-matrix unit tests.
- Add metadata listing, same-origin multipart upload, and protected attachment-download endpoints. No public URL, inline preview, edit, or delete endpoint is introduced.
- Accept only PDF/JPEG/PNG after extension, MIME, and file-signature agreement; maximum 10 MiB. Use bounded request-body reading, server-generated opaque storage keys, SHA-256 metadata, and a second size/checksum verification on download.
- Store bytes outside the repository in a private local development directory. The local filesystem adapter fails closed in production. Vercel/serverless production uploads remain disabled until a durable private object-storage adapter and deployment controls are implemented. Signature checks are not malware scanning.
- Audit list/upload/download operations with fixed non-sensitive reasons; do not place filenames, file bytes, checksums, or patient details in AuditLog.
- This phase is limited to administrative patient documents. Clinical, laboratory, radiology, complaint, and incident attachments remain within later workflow-specific permissions and services. Fix 01 also adjusts the storage-path expectation to use the host platform path resolver, so it passes on both Windows and POSIX systems, and removes an unused import from the download route.

### Phase 5E-1 — Family relationships and evidence-backed legal-guardian verification (Update 37 + Fix 01)

**Status: complete and locally verified.** The developer confirmed migration 7 applied, the database is up to date, 307 unit tests and 40 E2E tests passed, and typecheck, lint, and production build passed.

- Record directed family relationships between two existing active patient records using the existing `PatientRelationship` model. The patient whose file records the link is `patientId`; `relatedPatientId` is the other person; `relationshipType` describes the related person's relationship to the subject patient. Do not create an inverse row automatically; a reverse direction may be recorded separately from the other subject patient's file when required.
- Keep family relationship, legal-guardian designation, and patient-data access separate. Creating a family link grants no portal, appointment-management, or medical-record scope by itself.
- Add Reception-only `patient.relationship.read` and `patient.relationship.manage` capabilities. System Admin's existing `patient.delegation.manage` permission does not imply access to family identity records.
- Add protected list/create relationship endpoints and explicit legal-guardian verify/revoke endpoints. Verification is available only when the subject patient has a known date of birth confirming they are under 18, the related patient is active, and the selected evidence document is already attached to the subject patient's record with purpose `PATIENT_DOCUMENT`.
- Record evidence type and an FK to the existing private attachment. The migration preserves legacy verified guardian rows without fabricating evidence metadata and marks them with `guardianVerificationLegacy`; a database trigger prevents new rows from opting into that exemption, while the database constraint permits missing evidence only for grandfathered rows and requires both evidence fields for every new verification. The database validates that a linked attachment belongs to the same patient and is a `PATIENT_DOCUMENT`.
- Revoking guardianship clears the current guardian state and atomically revokes pending/active patient-access grants for that exact directed relationship. A future re-verification does not reactivate old grants; staff must explicitly reissue them.
- Audit events retain only fixed action metadata, the evidence type/reference identifier, and revoked-grant count. No document bytes, file contents, national ID, or submitted identity values enter audit reasons.
- This is a protected API/data-layer increment only; there are no UI screens or automatic patient-account links.
- Update 37 + Fix 01 applied migration `20261108040000_patient_family_relationships_guardian_workflows` (migration 7). The developer confirmed the final status is up to date. Do not use `db push`, reset, or seed as a migration shortcut.

### Phase 5E-2 — Family relationship correction and deactivation (Update 38)

**Status: complete and locally verified.** The developer applied migration 8 (`20261108050000_patient_relationship_lifecycle`), confirmed eight migrations up to date, and passed all five local checks: 315 unit tests, 42 E2E tests, typecheck, lint, and production build.

- Add Reception-only correction of the directed relationship type with a bounded reason code and an audit event that captures before/after type values without free-text notes or personal data.
- If a corrected relationship currently carries legal-guardian verification, clear that current designation and its evidence reference and revoke pending/active grants for that direction. A new guardian verification requires fresh evidence; old grants are not restored.
- Add soft deactivation rather than deletion. Preserve the family relationship row and record the deactivation timestamp and employee actor. Clear current guardianship state and revoke every pending/active grant tied to that directed relationship in the same Serializable transaction.
- The database prevents hard deletion, reactivation, or mutation of a deactivated relationship. Inactive rows remain visible in the protected relationship list as historical records. The existing unique directed pair remains in place; re-adding a deactivated pair is not supported in this increment.
- Delegated-access authorization and grant creation/renewal require an active relationship; guardian-based consent signer lookup also requires an active relationship. These checks fail closed even if a stale grant row remains.
- Add migration `20261108050000_patient_relationship_lifecycle` (migration 8) with active/deactivation metadata, employee FK, consistency checks, actor/history indexes, and immutability/delete-prevention trigger. Existing rows default to active; no patient, relationship, attachment, grant, or audit data is deleted.
- No UI screens, relationship reactivation, automatic inverse links, account linking, or booking authority are included.


## Phase 6A — Public appointment availability foundation (Update 39)

**Status: complete and locally verified.** The developer confirmed all five checks passed after Update 39: 332 unit tests, 45 E2E tests, typecheck, lint, and production build.

- Add a read-only `GET /api/public/appointment-availability` endpoint. It takes a doctor profile ID, active doctor-service catalog ID, and a real `YYYY-MM-DD` Cairo-local date.
- Reuse `DoctorProfile`, `DoctorSpecialty`, `DoctorService`, `ClinicWeeklySchedule`, `ClinicScheduleException`, `DoctorWeeklySchedule`, `DoctorScheduleException`, `ConsultationRoom`, and `Appointment`. Do not add duplicate scheduling models.
- Calculate candidate slots by intersecting clinic operating intervals with doctor availability, applying `EXTRA_HOURS`/`BLOCKED` exceptions, using the selected service duration, and excluding blocking appointment states and unavailable configured consultation rooms.
- The existing model has no independent slot increment, so candidate starts advance by the selected service duration. Do not invent a global interval.
- Weekly schedule values and date handling use `Africa/Cairo`; machine-local time is never used. Empty/unconfigured schedules yield no slots; no hours, shifts, or rooms are seeded or assumed.
- Public responses contain only the minimum doctor/service/slot fields and are `no-store`. The endpoint is advisory and does not reserve a slot or create any record. Update 40 reuses this calculation inside the authenticated patient-booking transaction; every later guest/Reception booking path must likewise revalidate at commit time. PostgreSQL remains the concurrency authority.
- No UI, patient creation, booking, queue entry, schema change, migration, seed, dependency, or environment update is included.

### Phase 6B1 — Authenticated patient booking (Update 40)

**Status: complete and locally verified.**

- Add `POST /api/patient/appointments` behind the verified patient-portal session guard and same-origin protection.
- Permit a patient to book for themself, or for another patient only when the active patient-access grant has the exact `BOOK_APPOINTMENTS` scope and passes the existing guardian/adult approval, expiry, revocation, and active-relationship policy. A family relationship alone is never authority.
- Run booking in a PostgreSQL Serializable transaction. Re-read the public doctor/service eligibility and recalculate the exact Cairo-local slot using the same availability logic through the transaction client.
- Recheck patient overlap and choose an available active consultation room inside the same transaction. If no rooms are configured, preserve the existing optional-room behavior; if rooms are configured, one must be free.
- Snapshot the current doctor-service duration, price, and currency into `Appointment`; automatically create `CONFIRMED` and its initial `PATIENT` status-history record. Do not create a `QueueEntry` at booking time.
- Keep the existing doctor, patient, and room PostgreSQL exclusion constraints in force. A concurrent conflict returns a safe 409 response; no duplicate booking is accepted.
- No new schema, migration, seed, dependency, guest identity, Reception route, overlap override, notification, booking UI, cancellation, or queue workflow is added in this increment.

### Remaining Phase 6B booking gates

- Update 43 adds the Reception resolution API by internal appointment ID. A guest-appointment search/list endpoint, Reception screen, and the public booking UI are not included yet; the later Reception workspace must provide the internal appointment ID without exposing the guest-management-token hash.
- Guest identity matching uses two distinct elements against the selected existing Patient. It never auto-links by the guest contact phone/name or management token. A successful link atomically commits the verification evidence and relationship; a patient-overlap conflict leaves the guest unresolved.
- At the time of Updates 42–43, the patient-overlap exception was intentionally unsupported and the existing patient exclusion constraint remained unchanged. Update 44 later implements the separately authorized exact-pair exception in Phase 6B3C; it does not permit public or patient-portal callers to bypass overlap protection.
- Booking on behalf of minors/adults must continue to use the exact `BOOK_APPOINTMENTS` grant; it must not imply medical-record access.

## Phase 6B2 — Public guest appointment booking (Update 41)

**Status: complete and locally verified after Update 41 + Fix 01.** The developer applied migration 9, confirmed nine migrations up to date, and passed all five checks: 378 unit tests, 49 E2E tests, typecheck, lint, and production build.

- Add `POST /api/public/appointments/guest` with a strict same-origin JSON contract: full name, phone, optional email, doctor, service, and the exact UTC instant returned by Phase 6A availability.
- Do not create a `Patient`, MRN, `PatientContact`, `PatientAccount`, identity verification, or delegation grant from a guest booking. Store provisional contact information in the dedicated `GuestAppointmentContact` table and leave `Appointment.patientId` null.
- Normalize Egyptian phone digits using the existing patient phone comparison helper. The phone is a later lookup signal only; never auto-link or reveal an existing Patient by phone/name.
- Reuse the Phase 6B1 serializable availability transaction, doctor/service revalidation, duration/price snapshot, room selection, `CONFIRMED` state, and doctor/room database exclusion constraints.
- Return a one-time random guest management token in the immediate `no-store` response; persist only its SHA-256 hash. This is a bearer secret for the later guest self-service flow, not OTP. Do not log it or put it in a URL.
- Record a PII-minimal `EXTERNAL` audit event. No email/SMS/WhatsApp delivery is added.
- Migration 9 makes `Appointment.patientId` optional and adds deferred identity invariants. An unresolved guest must have a pending guest contact. A linked guest must point to the same Patient and have a matching `VERIFIED` two-element `IdentityVerification` performed by the resolving employee.
- Prevent guest appointments from entering check-in/queue/encounter workflows before linking. Queue/Encounter rows referencing appointments must use the same already-linked Patient.
- Existing doctor and room overlap constraints remain unchanged. The patient-overlap exclusion does not apply while the guest has no verified Patient; it is rechecked by PostgreSQL when Reception later links the appointment.
- Deliberately exclude Reception booking, special patient-overlap override, guest self-service routes/UI, booking UI, notifications, and check-in/queue.

### Phase 6B3A — Reception booking for existing patients (Update 42)

**Status: complete and locally verified — 390 unit tests, 51 E2E tests, typecheck, lint, and production build passed.**

- Add `POST /api/reception/appointments` behind the existing operation-specific `appointment.manage` permission. The authorization guard resolves the current employee; the server service rechecks an active Employee with an active `RECEPTION` role assignment inside its Serializable transaction.
- Require an existing active `Patient` ID. This increment does not create a new patient, accept caller-supplied employee/role claims, or book unresolved guest contacts.
- Reuse the Phase 6A/6B booking context: exact UTC slot returned by the availability API, Cairo-local schedule revalidation, active doctor/service validation, duration/price snapshot, patient overlap check, consultation-room selection, and the existing PostgreSQL doctor/patient/room overlap constraints.
- Create `Appointment` with source `RECEPTION`, retain `createdByEmployeeId`, create a `STAFF` initial status-history record, and write a PII-minimal `RECEPTION_APPOINTMENT_BOOKED` audit event in the same transaction. No QueueEntry is created at booking time.
- This increment deliberately does not bypass patient-overlap protection. A conflicting patient appointment returns 409 as it does for portal booking. No schema change, migration, seed, dependency, or environment update is required.

### Phase 6B3B — Guest appointment identity resolution (Update 43)

**Status: complete and locally verified — Update 43; 406 unit tests across 44 files, 53 E2E tests, typecheck, lint, and production build passed.**

- Add `POST /api/reception/appointments/:appointmentId/resolve-guest` behind the existing `appointment.manage` permission; the service independently rechecks the active Reception assignment inside a Serializable transaction.
- The route accepts only a selected existing Patient ID and the existing strict two-identifier verification contract. Both distinct identifier values are compared against that Patient record; guest contact name/phone, booking reference, management token, or caller-supplied identity claims are never used as identity proof. Submitted identifier values are not persisted or audited.
- Only unresolved, confirmed `PUBLIC_WEBSITE` guest appointments may be resolved. Cancelled/no-show appointments, patient-portal appointments, Reception-created appointments, already-linked appointments, and inactive/missing Patients are rejected.
- On mismatch, persist a `FAILED` `IdentityVerification` tied to the appointment and selected Patient, plus a PII-minimal audit event; keep the appointment unresolved.
- On match, recheck same-patient overlap. A conflict is audited and remains unresolved. This increment does not bypass or modify the patient exclusion. A database race conflict also returns a conflict.
- On success, atomically write the matching `VERIFIED` `IdentityVerification`, set `Appointment.patientId`, update `GuestAppointmentContact` to `LINKED` with the same Patient/resolving employee/timestamp, revoke the prior guest management token by replacing its hash with an unreachable random hash, and write PII-minimal verification/link audit events. Migration 9's deferred cross-table invariant remains authoritative.
- No Patient, MRN, PatientAccount, PatientAccessGrant, PatientRelationship, QueueEntry, or Encounter is created. Linking does not grant the booker medical-record access or create guardian/adult delegation. No schema change, migration, seed, dependency, or environment update is included.

### Phase 6B3C — Audited same-patient overlap exception (Update 44)

**Status: complete and locally verified.** The developer applied migration 10 and passed all five checks: 425 unit tests, 53 E2E tests, typecheck, lint, and production build.

- Add the dedicated `appointment.patient-overlap.override` capability to the Reception role only. The application service rechecks the active Employee and active Reception assignment inside its Serializable transaction; Clinic Manager, System Admin, Doctor, and other roles do not receive this permission through the role matrix.
- Accept only four bounded reason codes: `CLINIC_DIRECTED_RESCHEDULE`, `CLINICIAN_REQUESTED_FOLLOW_UP`, `PATIENT_REQUESTED_EXCEPTION`, and `SAME_DAY_SERVICE_COORDINATION`. No free-text explanation, medical note, patient-supplied approval identity, or client-side boolean override is accepted.
- Apply the exception only to a real existing same-patient overlap in (a) Reception booking for an existing active Patient and (b) Reception guest-to-Patient linking after the existing two-distinct-identifier verification. A reason without a conflict is rejected. An actual conflict without the dedicated permission is rejected. Patient-portal and public guest booking never receive an override.
- Migration 10 creates `AppointmentPatientOverlapException`, an append-only audit table. Every exception captures the subject/conflicting appointment pair, patient, exact time interval snapshots, bounded reason, Reception employee, transaction ID, and database timestamp. A deferred PostgreSQL constraint trigger requires one current-transaction row per exact conflicting pair before commit. Rows cannot be updated, deleted, or truncated.
- Replace only `Appointment_patient_no_overlap` with the exact-pair deferred guard. A per-patient schedule-version write mutex serializes competing schedule writes (including patient reassignment); the original doctor and consultation-room exclusion constraints remain intact and unconditional. The application also locks the active Patient before querying conflicts. The booking/link write, exception rows, and existing audit events commit atomically.
- No appointment UI, guest search/list endpoint, reschedule flow, or general overlap override is included. Reception's future workspace must supply the internal appointment ID and expose the bounded reason selection without exposing guest-management secrets.




### Phase 6C1 — Patient self-service cancellation (Update 45)

**Status: complete and locally verified.** The developer confirmed 440 unit tests across 49 files, 55 E2E tests, typecheck, lint, and production build passed. No schema or migration change was included.

- Add `POST /api/patient/appointments/:appointmentId/cancel` behind the verified patient-portal session guard and same-origin protection.
- Permit cancellation of a linked appointment only by its own verified patient account, or by a grantee with the exact active `MANAGE_APPOINTMENTS` scope. `BOOK_APPOINTMENTS` alone is insufficient. The service rechecks actor, subject, delegation grant, relationship status, approval/guardian evidence, expiry, and revocation inside its Serializable transaction.
- Only `CONFIRMED` appointments can be cancelled through this route. Appointments already cancelled, checked in, waiting, in consultation, completed, or marked no-show are rejected.
- Self-service cancellation is allowed when `startsAt - now >= 24 hours`, inclusive at the exact boundary. Compare actual instants in milliseconds, not server-local dates; Cairo DST and host timezone do not alter the 24-hour rule.
- When the 24-hour window has started, leave the appointment unchanged and return a safe response directing the patient to Reception. Do not auto-cancel appointments, charge fees, or create a no-show record.
- Cancellation updates `Appointment.status`, `cancelledAt`, and a fixed server-selected cancellation reason, then writes `AppointmentStatusHistory` from `CONFIRMED` to `CANCELLED` with `changeSource = PATIENT`, authenticated `changedByPatientId`, and transaction timestamp. Client-supplied status, actor, or reason values are rejected.
- A per-Patient schedule-version mutex serializes cancellation against booking writes. Conditional update and Serializable transaction handling prevent a repeated or concurrent cancellation from creating duplicate history.
- Guest appointments without an established Patient link cannot use this endpoint. Guest bearer-token cancellation is implemented separately in Phase 6C3; guest rescheduling, Reception late changes, UI, notifications, and queue/check-in remain separate increments.
- No `AuditLog` row is written with a fabricated patient actor: the existing audit actor enum does not include PATIENT. The appointment status-history row is the patient-attributed lifecycle record for this increment.

## Phase 6 — Appointments and reception

Implement the approved booking flow: specialty → doctor → date/time → patient details/review → confirmation. Prevent doctor/patient overlap and overbooking, including concurrent requests. Support guest booking by phone without OTP and account booking with verified email. Guardians may book for children under the approved rules.

Reception supports check-in, queue management, and walk-ins. Walk-ins must not displace confirmed appointments. Patients may self-cancel or reschedule at least 24 hours before the appointment; later changes go through reception. Arrival target is 15 minutes early, with a 10-minute grace period and no automatic cancellation solely for lateness.

## Phase 7 — Doctor and nurse workspaces

Implement encounter-per-visit workflows. Doctors control diagnoses, treatment plans, prescriptions, laboratory/radiology orders, referrals, and follow-up. Doctors draft and approve encounters. Approved records cannot be silently overwritten or deleted; corrections preserve the previous value, reason, actor, and timestamp.

Nurses record vitals and assigned tasks and escalate concerns to a doctor. Nurses do not independently diagnose or prescribe.

### Phase 7A — Doctor current-day queue worklist (Update 54)

**Status: complete and locally verified after Update 54.** The developer confirmed typecheck, lint, 593 unit tests across 65 files, 86 E2E tests, and production build passed. This is an API/data-layer increment only.

- Add `GET /api/doctor/queue` protected by the existing `clinical.assigned.read` permission. Resolve the active employee from the authenticated actor; reject query parameters and never accept `doctorId`, employee ID, or patient ID from the caller.
- Inside a Repeatable Read transaction, recheck that the employee is active, has an active `DOCTOR` role assignment, and has a linked `DoctorProfile`. Resolve the queue from that profile only.
- Return only QueueEntry records for the current `Africa/Cairo` queue date, ordered by their persisted queue number. Do not allocate or modify queue numbers in this read path.
- Return minimal operational DTOs: ticket number/type/status/timestamps, patient display name/MRN/active flag, linked appointment status/time, existing encounter status/timestamps, and summary counts for all queue states. Waiting minutes apply only to `WAITING` and `CALLED`.
- Do not return contact details, date of birth, reason for visit, clinical notes, diagnoses, prescriptions, or diagnostic results.
- No new permission, Prisma schema, migration, seed, dependency, package script, environment variable, audit-on-refresh behavior, Doctor UI, appointment calendar, clinical chart, encounter creation, queue transition, clinical order, or Nurse workflow is introduced.

### Phase 7B — Doctor starts a consultation (Update 55)

**Status: complete and locally verified after Update 55.** The developer confirmed typecheck, lint, 613 unit tests across 66 files, 89 E2E tests, and production build passed. This is an API/data-layer increment only.

- Add `POST /api/doctor/queue/:queueEntryId/start`, protected by the existing `clinical.encounter.manage` permission. Require an empty JSON object and reject query parameters; the caller cannot choose patient, appointment, doctor, Encounter, status, timestamps, or actor.
- Resolve the active Doctor profile from the authenticated Employee and recheck active status, active `DOCTOR` role assignment, and DoctorProfile linkage inside the transaction.
- Lock the shared `DoctorProfile` mutex, then the exact queue ticket and its linked appointment when present. Restrict the ticket to the current `Africa/Cairo` queue date and the authenticated Doctor.
- Permit only a `CALLED` ticket for an active patient. Appointment tickets must point to the same patient and Doctor and remain `CHECKED_IN` with a valid check-in timestamp. Walk-in tickets must not carry an appointment.
- Prevent a second active `IN_SERVICE` queue ticket for the same Doctor. Repeated requests for the same already-started visit return `ALREADY_STARTED` without creating another Encounter or audit event.
- Create one `IN_PROGRESS` Encounter in the same Serializable transaction as the queue transition to `IN_SERVICE`. For appointment visits, link Encounter through `appointmentId` only; for walk-ins, link through `queueEntryId` only. This preserves the visit-origin contract from Phase 2B.
- For appointment visits, atomically transition Appointment from `CHECKED_IN` to `IN_CONSULTATION` and append a `STAFF` AppointmentStatusHistory row. Write a PII-minimal `DOCTOR_ENCOUNTER_STARTED` audit event. Any failure rolls back all related writes.
- Update the Doctor worklist projection so appointment-origin Encounters are read through `Appointment.encounter`, while walk-in Encounters are read through `QueueEntry.encounter`.
- No encounter editor, note, diagnosis, vitals, prescription, orders, referral, follow-up, completion/approval, Doctor UI, Nurse workflow, schema/migration, seed, dependency, package, or environment changes are introduced.



### Phase 7C — Doctor clinical-note draft (Update 56)

**Status: complete and locally verified.** The developer confirmed 640 unit tests across 68 files, 92 E2E tests, typecheck, lint, and production build passed. This is an API/data-layer increment only.

- Add `PUT /api/doctor/encounters/:encounterId/clinical-note`, protected by the existing `clinical.encounter.manage` permission, same-origin JSON validation, and no query parameters. Accept only the chief complaint, history of present illness, clinical examination, narrative assessment, and treatment plan.
- Resolve and recheck the authenticated active Doctor employee, active `DOCTOR` role assignment, and linked DoctorProfile inside a Serializable transaction. The Encounter must belong to that Doctor, remain `IN_PROGRESS`, have no completion timestamp, and retain a consistent visit origin.
- Reuse the existing Phase 2B schema: `Encounter.chiefComplaint` stores the complaint; a single `ClinicalNote` of type `INITIAL_ASSESSMENT` and status `DRAFT` stores HPI in `subjective`, examination in `objective`, narrative assessment in `assessment`, and treatment plan in `plan`. The narrative assessment is not a coded `EncounterDiagnosis`.
- Lock the Encounter row before inspecting/upserting the initial assessment. Create it when absent, or update only the existing unsigned draft authored by the authenticated employee. Multiple initial-assessment notes, a different author, or inconsistent note state fail closed.
- A `SIGNED` note is immutable through this route. Corrections are reserved for the `ClinicalAmendment` workflow. This endpoint does not sign the note or complete the Encounter.
- Every actual create/update writes a PII-minimal `DOCTOR_CLINICAL_NOTE_DRAFT_SAVED` audit event in the same transaction without putting clinical text in the audit row. A no-change request returns `UNCHANGED` without another audit event.
- No Doctor UI/autosave, coded diagnosis, vitals, prescriptions, diagnostic orders, referrals, follow-up, approval, completion, Nurse workflow, schema/migration, seed, dependency, package, or environment change is included.

### Phase 7D — Doctor Encounter diagnoses (Update 57)

**Status: complete and locally verified after Update 57 Fix 01.** The developer confirmed all five checks passed (669 unit tests across 70 files, 96 E2E tests, typecheck, lint, and production build). This was an API/data-layer increment only.

- Add a protected search endpoint for the active `DiagnosisCatalog` entries, returning at most 30 minimal DTOs and accepting only one optional `q` parameter. The catalogue currently contains six synthetic `MERUNO-DEMO` labels; these are not ICD-10, SNOMED CT, or another authoritative clinical coding system. Do not invent or imply official codes.
- Add protected GET/POST operations on `/api/doctor/encounters/:encounterId/diagnoses` to read the current Encounter diagnosis list and attach one diagnosis from the active catalogue. Request bodies cannot supply patient, doctor, author, catalogue display text, status, or timestamp.
- Recheck active Employee status, active `DOCTOR` role assignment, linked DoctorProfile, Encounter ownership, `IN_PROGRESS` state, and consistent appointment (`IN_CONSULTATION`) or walk-in (`IN_SERVICE`) origin inside the data service. Conceal an Encounter assigned to another Doctor as not found.
- Store the catalogue `displayName` as `EncounterDiagnosis.displayNameSnapshot`, retain the catalogue relation, authenticated employee author, optional bounded notes, and database timestamp. Reject inactive or unknown diagnoses and duplicate diagnosis IDs on one Encounter.
- The first attached diagnosis becomes primary automatically. Additional diagnoses are secondary unless the Doctor explicitly selects primary. A separate action can promote an existing Encounter diagnosis; the previous primary is demoted before the target is promoted inside the same Serializable transaction. The existing PostgreSQL partial unique index remains the final at-most-one-primary guarantee.
- Lock the Encounter row before diagnosis mutations. Record PII-minimal `DOCTOR_ENCOUNTER_DIAGNOSIS_ADDED` and `DOCTOR_ENCOUNTER_DIAGNOSIS_PRIMARY_CHANGED` audit events in the same transaction. Do not copy patient details, diagnosis notes, or clinical narrative to audit rows.
- Diagnosis rows are not deleted or rewritten by this increment; changing primary preserves the original diagnosis author and recorded time. A dedicated correction/history workflow for wrongly recorded diagnoses remains future work.
- No catalogue administration, seed additions, code-system import, free-text diagnosis creation, AI diagnosis, diagnosis deletion/correction, note signing, Encounter completion, prescriptions, vitals, lab/radiology orders, referrals, follow-up, Doctor UI, Nurse workflow, schema/migration, seed, dependency, package, or environment change is included.

### Phase 7E — Doctor prescription draft management (Update 58)

**Status: complete and locally verified.** The developer confirmed migration 11 (`20261109110000_prescription_prn_safety_fields`) was applied and `npm run db:migrate:status` reported the database up to date. The developer also confirmed typecheck, lint, 717 unit tests across 73 files, 101 E2E tests, and production build passed. This is an API/data-layer increment.

- Add `GET` and `POST /api/doctor/encounters/:encounterId/prescriptions` and `PUT /api/doctor/encounters/:encounterId/prescriptions/:prescriptionId`, protected by the existing `clinical.encounter.manage` permission, same-origin validation for mutations, JSON-only bodies, and strict request validation.
- Recheck active Employee status, active `DOCTOR` role assignment, linked DoctorProfile, Encounter ownership, `IN_PROGRESS` state, and consistent appointment (`IN_CONSULTATION`) or walk-in (`IN_SERVICE`) origin inside a Repeatable Read read or Serializable write transaction. Conceal an Encounter assigned to another Doctor as not found.
- Reuse `Prescription` and `PrescriptionItem`. Expose minimal DTOs for existing prescription history; create one DRAFT per Encounter, backed by a PostgreSQL partial unique index and return a conflict when a draft already exists. Draft contents include medication name, strength, dosage, administration route, frequency, duration, quantity/unit, refills, item instructions, and general instructions. Medication names and dose directions are manually entered synthetic demo text; no medication catalogue or clinical decision support is implied.
- Allow update only while the Encounter is `IN_PROGRESS`, the Prescription status is `DRAFT`, `issuedAt` is null, and the current employee is the original prescriber. Issued and cancelled prescriptions remain immutable through these routes. An update replaces the full draft item list atomically; unchanged requests return `UNCHANGED` without another audit event.
- Add structured PRN fields to `PrescriptionItem`: `isPrn`, `prnMaxQuantityPerDose`, `prnMaxDoseUnit`, and `prnMaxDosesPerDay`. Migration 11 (`20261109110000_prescription_prn_safety_fields`) defaults existing rows to non-PRN and adds a PostgreSQL CHECK requiring complete positive maximum-dose information for PRN items and null PRN fields otherwise. It checks for pre-existing duplicate drafts and then adds a partial unique index allowing one DRAFT per Encounter. If duplicate drafts are found, migration fails without modifying them. This is an explicit schema migration; back up the local database, confirm migration 10 is applied, then run Prisma validation/generation and `migrate deploy` as instructed in Update 58.
- Lock the Encounter row before draft creation/update and additionally lock the Prescription row on update. A single draft per Encounter is enforced by a PostgreSQL partial unique index and the serialized service workflow; concurrent conflicts fail with 409. Audit only the action, Prescription/Encounter identifiers, item count, authenticated employee, and timestamp—never medication or patient details.
- No prescription issuance/signing/cancellation action, prescription history/amendment model, pharmacy integration, medication catalogue, drug-interaction checker, dose calculator, clinical recommendations, controlled-substance workflow, clinical-note signing, Encounter completion, Doctor UI, Nurse workflow, lab/radiology orders, referrals, follow-up, seed updates, dependencies, package scripts, or environment changes are included.


### Phase 7F — Doctor laboratory test orders (Update 59)

**Status: complete and locally verified after Update 59 Fix 01.** The developer confirmed 751 unit tests across 75 files, 105 E2E tests, typecheck, lint without warnings, and production build passed. This is an API/data-layer increment that reuses the existing Phase 2C laboratory schema and the existing `clinical.order.create` permission. No schema or migration change was included.

- Add `GET /api/doctor/lab-catalog` (existing `clinical.order.create`) to search active `LabTest` catalog entries (maximum 30), plus `GET /api/doctor/encounters/:encounterId/lab-orders` (`clinical.assigned.read`) and `POST` (`clinical.order.create`) for the authenticated Doctor's own active Encounter.
- Inside the server service, re-resolve an active Employee with an active `DOCTOR` assignment and linked DoctorProfile; the caller cannot select a doctor, employee, patient, author, status, catalog label, price, currency, or order reference. Catalog search and order creation require `clinical.order.create`; Encounter order history requires `clinical.assigned.read`.
- Recheck Encounter ownership, `IN_PROGRESS` state, absence of a completion timestamp, and the Phase 7 visit-origin invariant inside a Repeatable Read read or Serializable write transaction. Appointment Encounters remain linked through the matching Appointment in `IN_CONSULTATION` with `Encounter.queueEntryId = null`, and that Appointment must have its matching `APPOINTMENT` QueueEntry in `IN_SERVICE`; walk-in Encounters remain linked through the matching `WALK_IN` QueueEntry in `IN_SERVICE`.
- Create an immediately `ORDERED` `LabOrder` with 1–20 distinct active catalog test IDs. New `LabOrderItem` rows begin as `PENDING`. Prices and currency codes are copied from the active catalog into item snapshots; unsupported/inactive catalog IDs fail closed. Priority is limited to `ROUTINE` or `URGENT`; clinical notes are bounded optional text.
- Order references are generated server-side. The service locks the Encounter before writes and uses a Serializable transaction so the Encounter, selected active catalog entries, order header, items, and audit event commit atomically. Concurrency conflicts return a safe 409 response.
- Audit `DOCTOR_LAB_ORDER_CREATED` with the actor, order/Encounter references, item count, and priority only. Do not copy test labels, patient identifiers, or clinical notes into the audit log.
- This update does not add lab-order draft/edit/cancel/issue workflows, specimen collection, sample receiving, result entry, result approval/release, critical-result communication, external referrals, manual/free-text test creation, catalog administration, billing, radiology, Doctor UI, Nurse permissions/workflows, seed changes, schema/migration, dependencies, package scripts, or environment changes. Multiple intentional LabOrders may be created for one Encounter; clients should prevent accidental double-submit. No idempotency token is persisted by this increment.


### Phase 7G — Doctor radiology orders (Update 60)

**Status: complete and locally verified after Update 60.** The developer confirmed migration 12 (`20261109223000_radiology_order_pregnancy_assessment`) was applied and all five local checks passed: 800 unit tests, 109 E2E tests, typecheck, lint, and production build.

- Add `GET /api/doctor/radiology-catalog` (`clinical.order.create`) to search up to 30 active `RadiologyProcedure` entries, plus `GET /api/doctor/encounters/:encounterId/radiology-orders` (`clinical.assigned.read`) and `POST` (`clinical.order.create`) for the authenticated Doctor's own active Encounter.
- Resolve and recheck the authenticated active Employee, active `DOCTOR` role assignment, linked DoctorProfile, Encounter ownership, `IN_PROGRESS` state, absence of a completion timestamp, and consistent appointment (`IN_CONSULTATION`) or walk-in (`IN_SERVICE`) source inside the data service. Conceal Encounters assigned to another Doctor as not found.
- Accept 1–10 unique active procedure IDs from the existing diagnostic catalogue only. Limit modalities to the existing `DIGITAL_XRAY` and `ULTRASOUND` records; procedure names, modalities, prices, currency, author, order reference, status, scheduling times, and radiology resource assignments are server-controlled. Prices/currencies are copied into `RadiologyOrderItem` snapshots.
- Create an immediate `ORDERED` `RadiologyOrder` with `PENDING` items in one Serializable transaction, lock the Encounter before writes, and record a PII-minimal `DOCTOR_RADIOLOGY_ORDER_CREATED` audit event. No exam or equipment reservation is created at this ordering step.
- Migration 12 adds a distinct order-time clinician decision to each new digital-X-ray `RadiologyOrderItem`: `SCREENING_REQUIRED` or `NOT_INDICATED`, plus recording employee and timestamp. A clinical rationale is mandatory for `NOT_INDICATED`. The new `RadiologyOrderPregnancyAssessment` enum is intentionally distinct from formal exam-day `PregnancyScreeningResult`. PostgreSQL CHECK/FK constraints and a trigger require the decision for every new digital-X-ray item and prohibit those fields on ultrasound items. Existing historical rows are left unchanged.
- `SCREENING_REQUIRED` directs the radiology workflow to complete the formal `RadiologyPregnancyScreening` before the exam. `NOT_INDICATED` requires the ordering clinician's reason. This order-time decision is not a pregnancy test, does not confirm or exclude pregnancy, and does not replace exam-day screening. The API does not infer applicability from age or gender or invent a cutoff.
- No scheduling, resource allocation, exam start/performance, formal exam-day pregnancy screening, report drafting/approval/release, result notification, cancellation, amendment, billing, Doctor UI, Nurse workflow, PACS/DICOM, CT/MRI/mammography/echo, seed change, dependency, package script, or environment change is included.


### Phase 7H — Doctor referrals (Update 61)

**Status: complete and locally verified after Update 61.** The developer confirmed all five checks passed (836 unit tests across 80 files, 112 E2E tests, typecheck, lint, and production build). This is an API/data-layer increment and reuses the existing Phase 2B `Referral` model and database integrity constraint. No schema or migration change was included.

- Add `GET /api/doctor/encounters/:encounterId/referrals` (`clinical.assigned.read`) and `POST` (`clinical.order.create`) for the authenticated Doctor's own active Encounter.
- Recheck the active Employee, active `DOCTOR` role assignment, linked DoctorProfile, Encounter ownership, `IN_PROGRESS` state, absence of a completion timestamp, and consistent appointment (`IN_CONSULTATION`) or walk-in (`IN_SERVICE`) visit origin inside the service. Conceal Encounters assigned to another Doctor as not found.
- Reuse the existing `Referral` model. Internal referrals require an active Specialty ID, an active Doctor ID, or both. If both are supplied, the Doctor must be associated with the selected Specialty. A Doctor target must have an active Employee record and active `DOCTOR` assignment. External referrals require a non-empty external facility name and cannot include internal target IDs. External contact is optional and bounded.
- Require a non-empty reason (maximum 1,000 characters) and bound optional instructions. Strict request schemas reject client-selected Encounter/patient/author/status/timestamp fields and any extra fields.
- New rows always begin as `PENDING`. GET returns only referrals attached to the authenticated Doctor's own active Encounter. POST locks the Encounter, validates the target, creates the Referral, and writes a PII-minimal `DOCTOR_REFERRAL_CREATED` audit event in one Serializable transaction.
- The application rules align with the existing `Referral_target_matches_type_chk` database constraint. No duplicate schema or migration is added. Multiple deliberate referrals may be created for one Encounter; clients should prevent accidental double-submit. No idempotency token is persisted.
- Referral accept/complete/cancel actions, referred-Doctor inbox, follow-up, attachments, and Doctor/Nurse UI are separate later increments. The existing status enum has no `REJECTED` value; no rejection state is inferred or added here. External referral receipt and completion remain outside the internal Doctor workspace.


### Phase 7I — Doctor referral inbox and lifecycle (Update 62)

**Status: implementation prepared; local verification pending.** This is a server-side API/data-layer increment. It reuses the original `Referral` model and existing `ReferralStatus` enum; no schema or migration change is included.

- Add `GET /api/doctor/referrals/inbox` protected by `clinical.assigned.read`. Resolve the current active Doctor from the authenticated employee; return only internal referrals in `PENDING` or `ACCEPTED` state addressed directly to that Doctor or to one of their active specialties. A direct referral to another Doctor is not visible just because the current Doctor shares its specialty.
- Return all matching open referrals in newest-first order, with only referral fields, source Encounter/Doctor reference, and minimal patient identity (display name, MRN, active flag). Do not include DOB, contacts, full clinical chart, diagnoses, or clinical notes.
- Add `POST /api/doctor/referrals/:referralId` with a strict one-field request body: `ACCEPT`, `COMPLETE`, or `CANCEL`. No caller-selected actor, Doctor, patient, target, status, or timestamps are accepted.
- The assigned Doctor, or an active Doctor member for a specialty-only referral, may transition `PENDING` → `ACCEPTED` and `ACCEPTED` → `COMPLETED`. `completedAt` is set only on completion using the server clock.
- Only the originating Doctor employee may transition `PENDING` or `ACCEPTED` → `CANCELLED`. No transition is allowed after `COMPLETED` or `CANCELLED`. External referrals cannot be accepted/completed inside this clinic workspace; the originating Doctor may cancel an open external referral.
- The existing enum has no `REJECTED` state. This update does not add one or misuse `CANCELLED` as rejection. Specialty-only referrals are team-owned: the existing schema has no accepted-by field, so another active Doctor in the same specialty may complete the accepted work. Individual acceptance ownership requires a separately reviewed migration.
- Lock the Referral row, recheck active Doctor identity, validate the exact target/author and current state, update status, and write a PII-minimal `DOCTOR_REFERRAL_ACCEPTED`, `DOCTOR_REFERRAL_COMPLETED`, or `DOCTOR_REFERRAL_CANCELLED` audit event in one Serializable transaction.
- No rejected status, reassignment, editing, accepted-by ownership field, external-provider receipt confirmation, patient appointment creation, cross-Doctor Encounter transfer, notifications, attachments, follow-up, Doctor/Nurse UI, schema/migration, seed, dependency, package, or environment change is included.


### Phase 7J — Doctor prescription issuance (Update 63)

**Status: implementation prepared; local verification pending.** This is an API/data-layer increment and reuses the Phase 2B `Prescription`/`PrescriptionItem` models and existing status enum. No schema or migration change is included.

- Add `POST /api/doctor/encounters/:encounterId/prescriptions/:prescriptionId/issue`, protected by `clinical.encounter.manage`, same-origin validation, JSON-only body, and a strict empty-object schema. Caller-selected employee, prescriber, status, issue timestamp, item IDs, or other fields are rejected.
- Recheck active Employee, active `DOCTOR` role, linked DoctorProfile, Encounter ownership, `IN_PROGRESS` state, absence of completion timestamp, and consistent appointment (`IN_CONSULTATION`) or walk-in (`IN_SERVICE`) origin inside a Serializable transaction.
- Lock the Encounter and exact Prescription row. Require the Prescription to belong to the Encounter, remain `DRAFT` with `issuedAt = null`, and be issued only by its original `prescribedByEmployeeId` author.
- Recheck the persisted item count is between 1 and 20. Draft creation already validates the medication fields, quantity/unit pairing, and structured PRN maximum-dose constraints; issuance does not attempt to provide clinical decision support or re-evaluate drug suitability.
- Atomically transition `DRAFT` to `ISSUED`, set `issuedAt` using the server clock, and add a PII-/medication-minimal `DOCTOR_PRESCRIPTION_ISSUED` AuditLog event. A failed conditional update, duplicate issue, author mismatch, invalid persisted item count, or serialization conflict does not produce an audit event.
- Existing draft update logic remains limited to `DRAFT` with null issue time, leaving issued rows immutable through the current draft API. Cancellation, corrections/versioning, re-issue, medication catalogue, dispensing, clinical-note signing, Encounter completion, Nurse workflows, UI, notifications, and all schema/migration/seed/dependency/package/environment changes remain out of scope.
- No new permission or data field is required. Local validation must confirm route typing, unit policy behavior, authentication boundaries, lint, and production build.

### Phase 7K — Doctor clinical-note signing (Update 64)

**Status: complete and locally verified.** The developer confirmed Update 64 passed typecheck, lint, 901 unit tests across 85 files, 124 Playwright E2E tests, and production build. This is a server-side API/data-layer increment and reuses the Phase 2B `ClinicalNote` status and `signedAt` fields. No schema or migration change is included.

- Add `POST /api/doctor/encounters/:encounterId/clinical-note/sign`, protected by `clinical.encounter.manage`, same-origin validation, JSON-only body, no query parameters, and a strict empty-object request. The caller cannot choose note ID, author, signer, status, signature time, clinical content, or Encounter status.
- Recheck the active Employee, active `DOCTOR` role assignment, linked DoctorProfile, Encounter ownership, `IN_PROGRESS` state, absence of `completedAt`, and consistent appointment (`IN_CONSULTATION`) or walk-in (`IN_SERVICE`) visit origin inside a Serializable transaction.
- Lock the Encounter before reading the initial-assessment note, matching the existing draft-save lock order. Require exactly one `INITIAL_ASSESSMENT` note, authored by the authenticated Doctor, with `status = DRAFT` and `signedAt = null`. Missing, duplicate, already-signed, inconsistent, or differently authored notes fail closed.
- Require a non-empty persisted chief complaint and at least one non-empty SOAP section (`subjective`, `objective`, `assessment`, or `plan`). This is a structural completeness gate only; it does not infer that a clinical domain was assessed or provide clinical decision support.
- Conditionally transition only that note from `DRAFT` to `SIGNED`, set `signedAt` using the server clock, and write `DOCTOR_CLINICAL_NOTE_SIGNED` in the same transaction. Do not copy clinical text into the audit event. A repeated sign attempt is rejected without another audit row.
- Return a minimal note DTO with its persisted sections and server-generated signature time. The Encounter remains `IN_PROGRESS`; this increment does not complete or close the visit. Existing draft-save logic continues to refuse signed notes; a later ClinicalAmendment workflow must preserve previous content, corrected content, reason, author, and timestamp without silently overwriting the signed note.
- No amendment/correction API, Encounter completion, prescription correction/versioning, vital-sign workflow, referral follow-up, Nurse task workflow, Doctor/Nurse UI, schema/migration, seed, dependency, package, or environment changes are included.


### Phase 7L — Doctor clinical-note amendments (Update 65)

**Status: complete and locally verified.** The developer confirmed Update 65 passed typecheck, lint, 928 unit tests across 87 files, 128 Playwright E2E tests, and production build. This is a protected API/data-layer increment. It reuses the Phase 2B `ClinicalAmendment` model (`clinicalNoteId`, `previousContent`, `correctedContent`, `reason`, `createdByEmployeeId`, and `createdAt`). No schema or migration change is included.

- Add `GET /api/doctor/encounters/:encounterId/clinical-note/amendments`, protected by `clinical.assigned.read`, to return the original signed initial-assessment snapshot, the latest effective corrected snapshot, and the append-only amendment history.
- Add `POST` on the same route, protected by `clinical.encounter.manage`, same-origin validation, JSON-only body, no query parameters, and a strict request containing a bounded reason and at least one supported correction field.
- Re-resolve the active Employee, active `DOCTOR` role, linked DoctorProfile, Encounter ownership, the sole `INITIAL_ASSESSMENT` note, its `SIGNED` state and non-null signature timestamp, and the exact original author. Only the Doctor who authored the signed note may read or append this amendment history through these endpoints.
- Support corrections to `chiefComplaint`, `historyOfPresentIllness`, `clinicalExamination`, `assessment`, and `treatmentPlan`. The caller submits only changed fields; the server computes the full previous/corrected snapshots. Optional SOAP fields may be cleared, while the chief complaint and at least one SOAP section must remain non-empty.
- Store snapshots as version-1 JSON in the existing `previousContent` and `correctedContent` text columns. Each new `previousContent` must exactly match the previous effective snapshot. Validate the full history chain before returning or appending; malformed or broken history fails closed.
- Lock the Encounter before its ClinicalNote, consistent with the earlier Doctor note workflow. Append the ClinicalAmendment and PII-/clinical-content-minimal `DOCTOR_CLINICAL_NOTE_AMENDED` AuditLog entry in the same Serializable transaction. Never update the signed `ClinicalNote` row or change its original `signedAt` timestamp.
- A repeated correction that does not change the effective content returns `UNCHANGED` and creates no amendment or audit row. In-progress and completed Encounters are eligible only when their completion timestamp and appointment/walk-in origin state are consistent; cancelled or inconsistent Encounters are rejected.
- No prescription correction/version history, diagnosis amendment, referral follow-up, vital-sign workflow, Nurse task workflow, Encounter completion, Doctor/Nurse UI, patient portal display, schema/migration, seed, dependency, package, or environment change is included.

### Phase 7M — Nursing tasks, vital signs, and Encounter completion (Update 66)

**Status: complete and locally verified after Update 66 + Fix 01.** The developer applied Migration 13, confirmed the database was up to date, and then confirmed typecheck, lint, 990 unit tests, 138 E2E tests, and production build passed. This combined increment adds server-side Nurse task lifecycle, linked vital-sign recording, and Doctor-controlled Encounter completion. It reuses the existing `VitalSign` model and `nursing.context.read`, `nursing.vitals.record`, `nursing.task.manage`, `clinical.assigned.read`, and `clinical.encounter.manage` permissions. No new role or permission is introduced.

- The assigned Doctor may create a bounded task for an active Employee with an active `NURSE` role. Supported tasks: record/repeat vital signs, pre-consultation assessment, procedure preparation, and other documented nursing work.
- Nurses can list only tasks assigned to their authenticated employee identity. They may start, complete, or escalate their own task. Vital-sign tasks require at least one task-linked `VitalSign` before completion. Nurses cannot diagnose, prescribe, sign notes, resolve escalations, or close Encounters.
- A Nurse may escalate an in-progress task with a required note. The task is marked `ESCALATED` and the Doctor receives a minimal in-app notification; the clinical note itself is not copied into notification or AuditLog. The Doctor assigned to that Encounter can resume or cancel the escalated task with a recorded reason.
- Measurements append to the existing `VitalSign` model. The server sets recorder, time, task link, and BMI. Plausibility bounds are data-entry safeguards, not clinical thresholds. No automated abnormal-value classification is introduced; a Nurse manually escalates a concerning reading or symptom under clinic protocol.
- The Doctor may complete an Encounter only when exactly one signed initial assessment exists and was authored by that Doctor, no nursing task is pending/in-progress/escalated, and no prescription remains a draft. The operation atomically completes the Encounter and its appointment or walk-in queue source, recording appointment history and an audit event. Open diagnostic orders/referrals may remain for post-visit follow-up.
- All mutating operations lock the Encounter before related task/source rows so task transitions and Encounter completion serialize. Existing VitalSign rows remain unchanged and have `nursingTaskId = NULL` after migration.
- Migration 13 creates NursingTask enums/table, lifecycle consistency constraints, indexes, employee/Encounter foreign keys, and a nullable VitalSign-to-task link. Do not reset, push, backfill, reseed, or replace migration history.
- No Doctor/Nurse UI, patient portal display, referral follow-up, prescription correction/versioning, lab/radiology processing, or automated clinical alert thresholds are included.


## Phase 8 — Laboratory and radiology

**Status: complete and locally verified.** Update 67 completed 8A–8C (Migration 14); Update 68 completed 8D–8E; Update 69 completed 8F–8H (Migration 15); Update 70 completed 8I–8J (Migration 16). The developer confirmed all Update 70 checks passed after Fixes 01–03, including typecheck, lint, unit tests, migration status, Playwright, and production build.

| Subphase | Scope | Delivery |
| --- | --- | --- |
| 8A | Internal Lab Staff worklist, two-element patient identity verification, sample collection | Update 67 |
| 8B | Sample receipt/rejection, specimen history, and controlled recollection | Update 67 |
| 8C | Test processing and result draft entry using active test-component snapshots | Update 67 |
| 8D | Result submission for independent review, approval/rejection, and controlled release | Update 68 |
| 8E | Critical-result notification, read-back, acknowledgment, escalation, and ordering-Doctor clinical review | Update 68 |
| 8F | External laboratory referral lifecycle, scoped patient consent, external-provider critical-result read-back, and Reception intake for external patients with a diagnostic-only record type | Update 69 |
| 8G | Radiology scheduling, active resource/modality validation, configured procedure duration, timezone-aware start time, and database-enforced non-overlapping resource allocation | Update 69 |
| 8H | Exam-linked two-element patient identity verification, documented preparation outcome, exam-day X-ray pregnancy screening, Radiologist review for positive/declined responses, and a readiness gate before execution | Update 69 |
| 8I | Readiness-gated exam execution, report drafting, independent Radiologist review/approval, and controlled report release | Update 70 |
| 8J | Critical-result read-back and escalation, consent-backed external radiology referrals/results, protected delivery to the assigned Doctor, and Doctor clinical review | Update 70 |

**Laboratory workflow:** Doctor order → Lab Staff identity check using two distinct stored patient identity elements → sample collection → sample receipt/acceptance or rejection → processing → draft result entry → submission → independent Lab Staff review → approval or return for correction → controlled release. Critical results require documented communication and ordering-Doctor read-back before release. After release, the ordering Doctor records a clinical review or follow-up decision. Rejected samples remain in history and may be recollected only after the latest sample is rejected. Update 68 reuses existing review, communication, and clinical-review tables; it adds no migration. Update 69 implements external laboratory workflows through two distinct paths: Reception may intake an outside provider request for an existing identity-verified patient or create a short-lived diagnostic-only patient record without creating a clinic Encounter/account; separately, an assigned Doctor may refer an active Encounter to an outside laboratory only after explicit, matching granted data-sharing consent. Lab Staff record received external summaries and the responsible Doctor reviews Encounter-linked referrals; external-intake critical results use a Lab Staff documented external-provider read-back. Diagnostic-only records are blocked from appointments, queue entries, Encounters, patient accounts, and family relationships until Reception re-verifies identity and explicitly converts the record. Radiology scheduling and preparation are delivered in the same update to keep resource allocation, identity, preparation, and X-ray screening state coherent.

**Radiology workflow:** scheduling → identity/preparation → pregnancy screening before X-ray → readiness-gated exam execution → report draft → independent Radiologist review/approval → critical communication/read-back when indicated → controlled release → assigned-Doctor clinical review. Update 70 completes the API/data layer for 8I–8J: start rechecks readiness inside the transaction, exam completion is attributed to Radiology Staff, reports require independent Radiologist approval, and critical reports remain unreleased until all recorded read-back communications are acknowledged. External radiology results use a separate consent-backed Encounter referral/result lifecycle and are never represented as clinic-performed exams. Permissions remain separated between Radiology Staff, Radiologists, and the assigned Doctor. Only digital X-ray and ultrasound are in scope. Do not add CT, MRI, mammography, echocardiography, PACS, or DICOM integration.

**Data and safety boundaries:** use synthetic patient data only. Reuse the existing Phase 5B two-element identity-verification schema and matcher; do not create a second identity-matching implementation. Do not store submitted identity values in notes/audit logs. Keep Lab Staff, Radiology Staff, and Radiologist roles separate. The Phase 8 APIs are data-layer increments; the complete staff workspaces are delivered in the later UI phases.

## Phase 9 — Billing and payments

**Status: Update 71 / Phase 9A complete and locally verified; Update 72 / Phase 9B implementation prepared, local verification pending.** Update 72 reuses the existing Phase 2D invoice, discount, and refund models and adds only the missing external-intake invoice source and refund execution audit fields through one incremental migration.

| Workstream | Scope | Consolidated delivery |
| --- | --- | --- |
| 9A | Encounter-linked draft invoices from completed Appointment, released internal Lab, and completed in-clinic Radiology service snapshots; service-completion gate; invoice issue; one full payment by cash, POS card, or clinic e-wallet | Update 71 |
| 9B | Discount request/manager decision, approved discount application, refund request/manager decision, item-level refund completion with original payment method and invoice history preserved, and financial reporting | Update 72 |
| 9C | Cashier invoice/payment/receipt workbench, manager approval workbench, and role-scoped finance reporting | Update 71 and Update 72 |
| 9D | Diagnostic-only external-intake invoices and walk-in consultation price snapshots, without inventing an Encounter for an external patient | Update 72 |

Support multi-item invoices and full payment only after service. Accepted methods: cash, POS card, and clinic-supported electronic wallets. No online payment gateway, installments, partial payments, or insurance claims.

Discounts require authorized manager approval and a recorded reason. Refunds require manager approval. An unprovided item in a multi-item invoice may be refunded without cancelling other items. Preserve the original invoice and record refund details; never delete or silently overwrite an issued invoice.

Update 71 is limited to Encounter-linked invoices. It includes only services with a completed Appointment snapshot, a released internal Lab result, or a completed in-clinic Radiology exam. Drafts are refreshed as services finish; issuance is blocked while related non-cancelled services remain unfinished or the draft does not contain every completed billable item. Diagnostic-only external intake and walk-in consultation price snapshots remain Update 72 scope, rather than inventing a Doctor/Encounter or using a possibly changed catalogue price.

### Phase 9B — Discounts, refunds, external-intake billing, and finance reports (Update 72)

**Status: implementation prepared; local verification pending.** Update 72 includes:

- Cashier discount requests against draft invoices only. Each request records an amount and reason, and a Clinic Manager must approve it before the discount changes the invoice total. A requester cannot decide their own request.
- Cashier refund requests tied to selected invoice items that are explicitly recorded as not provided. The server calculates the refundable net line amount after allocating invoice-level discounts; the client cannot submit a refund amount. A Clinic Manager must approve or reject the request with a recorded rejection reason. Approved refunds are completed by Cashier using the original payment method; POS/e-wallet refunds require a transaction reference. Original invoices and payment rows remain preserved.
- A controlled external diagnostic-intake invoice source for the existing ExternalLabIntake model, restricted to released in-clinic laboratory results. Encounter-linked invoices remain unchanged. An invoice must point to exactly one supported source and the patient must match that source.
- A Walk-in consultation price snapshot selected from the assigned doctor's active consultation services. The chosen price and description are retained on the draft and are not silently refreshed from the current catalogue.
- Cashier and Clinic Manager workbench components for discount/refund workflows, refund execution, and reporting. The report uses Africa/Cairo date boundaries and separates billed totals, collected payments, refunds, net collection, outstanding issued invoices, and payment methods.
- One incremental migration adds the optional ExternalLabIntake invoice link and the employee/payment-channel audit fields for completed refunds. It does not delete or rewrite existing billing rows.

No online payment gateway, installments, partial payments, insurance claims, or System Admin financial access is introduced. The UI components accept translation `copy` props so each workspace can reuse the project's existing Arabic/English dictionaries; no new translation system is added.

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


### Phase 6C2 — Patient self-service rescheduling (Update 46)

**Status: complete and locally verified.** The developer confirmed 458 unit tests across 51 files, 57 E2E tests, typecheck, lint, and production build passed.

- Add a patient-portal Route Handler to move a Patient-linked, confirmed appointment to a newly available future start instant.
- Permit self-service rescheduling only when the existing appointment is at least 24 hours away. Inside that window, the patient must contact Reception; no automatic cancellation or reschedule occurs.
- Require the exact `MANAGE_APPOINTMENTS` scope for a delegate. The `BOOK_APPOINTMENTS` scope is insufficient.
- Keep the existing doctor, service, duration, booked price, currency, booking reference, and confirmation timestamp unchanged. Only date/time and the room assignment may change; doctor/service changes are handled by Reception.
- Reuse the public appointment availability calculation inside the serializable transaction while excluding only the appointment currently being moved from doctor/room busy intervals. This exclusion is an internal server option and is not accepted from the public query schema.
- Acquire the existing per-patient schedule mutex, revalidate the appointment, patient overlap, doctor availability, and room availability, then conditionally update the appointment. Existing PostgreSQL doctor/room exclusions and the patient overlap trigger remain authoritative.
- Add a `PATIENT`-actor history event retaining `CONFIRMED` status and recording previous/new UTC start instants in the reason field. No client actor, patient, doctor, service, room, duration, price, or status values are accepted.
- Guest bearer-token rescheduling, Reception late changes, changing doctor/service, UI, and database schema/migration changes remain outside this increment. Guest self-service cancellation is implemented separately in Phase 6C3.

### Phase 6C3 — Guest self-service cancellation (Update 47)

**Status: implementation prepared; local verification pending.** No schema or migration change is included.

- Add `POST /api/public/appointments/guest/cancel`, protected by exact same-origin validation and a strict JSON body containing only the guest management token. The token is never accepted in a URL or query string.
- Hash the supplied 32-byte base64url token with SHA-256 and resolve only the matching `GuestAppointmentContact`. Do not log, return, or persist the raw token. Invalid/revoked tokens receive a generic no-store 404 response.
- Permit cancellation only while the linked appointment remains `PUBLIC_WEBSITE`, unresolved (`patientId = null`, `PENDING_VERIFICATION`, no resolved Patient), and `CONFIRMED`. The 24-hour boundary is inclusive and compares elapsed UTC instants. A request inside 24 hours leaves the booking unchanged and directs the guest to Reception.
- Lock `Appointment` then `GuestAppointmentContact` in a consistent order and re-read state/token under a Serializable transaction. Conditional state updates protect against token replay and concurrent Reception guest linking.
- Transition `CONFIRMED` to `CANCELLED`, apply the fixed `GUEST_REQUESTED_CANCELLATION` reason, add a `SYSTEM` lifecycle history row (the enum has no guest actor), and add a PII-minimal `EXTERNAL` audit event. No guest name, phone, email, or bearer token is stored in audit/history.
- Rotate the stored token hash to an unreachable random hash in the same transaction. The token is invalidated after successful cancellation; Reception linking already revokes it. A serialization conflict returns a safe 409.
- No guest rescheduling, Reception cancellation/rescheduling, appointment list/search UI, notifications, token-expiry policy, rate-limit provider, schema/migration, seed, dependency, or environment change is included.


### Phase 6C4 — Guest self-service rescheduling (Update 48)

**Status: complete and locally verified.** The developer confirmed 495 unit tests across 55 files, 66 E2E tests, typecheck, lint, and production build passed. No schema or migration change was included.

- Add `POST /api/public/appointments/guest/reschedule`, protected by exact same-origin validation and a strict JSON body containing only the bearer management token and a new offset-aware start timestamp. The token is never accepted in a URL or query string.
- Hash the 32-byte base64url token with SHA-256 before lookup. Resolve only its matching `GuestAppointmentContact`; invalid or revoked tokens receive a generic no-store 404 and the raw token is never logged, returned, or persisted.
- Permit only a confirmed `PUBLIC_WEBSITE` appointment that remains unresolved (`patientId = null`, contact `PENDING_VERIFICATION`, no `resolvedPatientId`). A Reception-linked appointment cannot use the guest token because linking revokes its hash.
- Require the existing appointment to be at least 24 elapsed hours away, inclusive at the exact boundary. The target must be a different future instant. Inside the final 24 hours, leave the appointment unchanged and direct the guest to Reception.
- Keep doctor, service, duration, booked-price/currency snapshot, booking reference, status, and confirmation timestamp unchanged. Only start/end instants and room assignment can change. If configured service duration has changed since booking, require Reception review rather than silently changing the visit duration or price.
- Reuse public appointment availability inside the Serializable transaction while excluding only the appointment currently being moved. Revalidate the doctor slot and an active consultation room; existing doctor and room exclusion constraints remain authoritative under concurrent writes.
- Lock Appointment then GuestAppointmentContact, matching guest cancellation and Reception identity resolution, and re-read token/state after both locks. The token hash remains valid after rescheduling for additional management of the same unresolved booking; cancellation and Reception linking revoke it.
- Add `CONFIRMED` → `CONFIRMED` `SYSTEM` history with old/new UTC instants, plus a PII-minimal `EXTERNAL` audit event. Do not store guest name, phone, email, raw token, or client-selected actor data in history/audit.
- No guest search/list UI, token-expiry/rate-limit provider, paid messaging, Reception late-change workflow, appointment UI, notification delivery, schema/migration, seed, dependency, package, or environment change is included.


### Phase 6C5 — Reception appointment cancellation and rescheduling (Update 49)

**Status: complete and locally verified.** The developer confirmed 511 unit tests across 57 files, 70 E2E tests, typecheck, lint, and production build passed. No schema or migration change is included.

- Add `POST /api/reception/appointments/:appointmentId/cancel` and `POST /api/reception/appointments/:appointmentId/reschedule`. Both require `appointment.manage`, same-origin validation, and an active Reception employee assignment rechecked inside the Serializable transaction.
- Accept only bounded reason codes (`PATIENT_REQUESTED`, `DOCTOR_UNAVAILABLE`, `CLINIC_OPERATIONAL`, `DUPLICATE_BOOKING`). The client cannot supply patient identity, actor, status, doctor, service, room, duration, or price.
- Allow only upcoming, confirmed appointments whose source/Patient/GuestAppointmentContact identity state is consistent. This includes pending unresolved public guest bookings and identity-linked guest bookings. No check-in, waiting, in-consultation, completed, cancelled, no-show, or past appointment is changed.
- Classify a Reception action as `LATE` when less than 24 elapsed hours remain, otherwise `STANDARD`; the exact 24-hour boundary is standard. Do not apply a fee or penalty.
- Cancellation transitions `CONFIRMED` → `CANCELLED`, writes the `STAFF` history event and PII-minimal audit event, and invalidates a pending unresolved guest's token hash in the same transaction.
- Rescheduling is limited to a different future slot for the same doctor/service. Preserve duration and booked price/currency snapshots; revalidate public slot availability, patient overlap, and active consultation room inside the transaction. If configured duration has changed, stop and require separate review.
- Acquire the per-patient appointment-schedule mutex before locking `Appointment`, then lock `GuestAppointmentContact`, matching patient and guest operation lock order. Use conditional updates and preserve existing PostgreSQL exclusion constraints. No patient-overlap exception is inferred or created.
- Rescheduling keeps an unresolved guest's management token valid; a linked guest token remains revoked. History records the prior/new UTC start, reason code, timing classification, employee actor, and timestamp.
- No Reception list/search UI, lookup API, doctor/service transfer, after-check-in change, no-show marking, check-in/queue/walk-in workflow, notification delivery, schema/migration, seed, dependency, package, or environment change is included.

### Phase 6D1 — Reception appointment check-in and queue entry (Update 50)

**Status: complete — Update 50; locally verified.** No schema or migration change is included.

- Add `POST /api/reception/appointments/:appointmentId/check-in`, protected by the existing `appointment.manage` permission, same-origin validation, and an active Reception employee assignment rechecked inside the transaction.
- Require two distinct supported identity elements (`FULL_NAME`, `DATE_OF_BIRTH`, `PHONE`, or `MRN`) and compare both against the linked active Patient record using the existing identity-verification matcher. Persist only identifier types, outcome, actor, and time; never persist or audit submitted values. A failed comparison persists a FAILED `IdentityVerification` and a PII-minimal audit event, but creates no QueueEntry and does not change appointment status.
- Only an active Patient-linked appointment in `CONFIRMED` status can be checked in. A `PUBLIC_WEBSITE` guest must first be identity-resolved to the exact Patient; pending/unresolved guest bookings cannot enter the queue. Patient Portal and Reception appointments must not have a GuestAppointmentContact.
- Restrict check-in to the appointment's Cairo-local date. The 15-minute early-arrival target is informational, not a hard restriction. The 10-minute grace boundary is inclusive; after it, Reception must explicitly accept the late arrival. No automatic cancellation or `NO_SHOW` transition is performed.
- In one Serializable transaction, lock the Appointment then any GuestAppointmentContact, re-read all eligibility state, record identity verification, set `Appointment` from `CONFIRMED` to `CHECKED_IN` with `checkedInAt`, create one `QueueEntry` of type `APPOINTMENT` and status `WAITING`, append `STAFF` status history, and write PII-minimal audit events.
- Allocate queue numbers sequentially per doctor and Cairo-local date by locking the `DoctorProfile` row. All future queue-entry creators, including walk-in registration, must use the same allocator in the insert transaction; compute no unlocked `MAX(queueNumber) + 1`.
- Return only the queue ticket metadata and appointment/queue statuses; do not expose patient medical details to Reception.
- Queue calling/advancement, queue cancellation/completion, Walk-in registration, public queue displays, Reception list/search UI, no-show processing, notifications, schema/migration, seed, dependency, package, and environment changes remain outside this increment.


### Phase 6D2 — Reception doctor queue board and Call Next (Update 51)

**Status: complete and locally verified.** The developer confirmed 538 unit tests across 60 files, 76 E2E tests, typecheck, lint, and production build passed.

- Add `GET /api/reception/queue?doctorId=<doctorId>` for the current Cairo-local day and one active doctor. Return operational ticket details only: queue number/type/status, operational timestamps, elapsed waiting minutes, patient name/MRN/active flag, and appointment time. Never return patient contact or clinical details.
- Add `POST /api/reception/queue/call-next` with a strict body containing only `doctorId`. Require the existing `appointment.manage` permission, same-origin validation, and an active Reception role recheck inside the service transaction.
- Serialize concurrent calls by locking `DoctorProfile` inside a Serializable transaction. Waiting `APPOINTMENT` tickets take priority over `WALK_IN` tickets. An unended `CONFIRMED` appointment for the current Cairo-local day holds walk-ins even before the booked patient checks in.
- If a walk-in is already `CALLED` and an appointment becomes eligible or remains within its confirmed time window, return that walk-in to `WAITING` and audit the deferral. If a ticket is already `IN_SERVICE`, do not call a second patient.
- If the priority queue head is inactive, block without silently skipping, reordering, or calling a later patient.
- Change only `QueueEntry` from `WAITING` to `CALLED`, set `calledAt`, and write a PII-minimal employee audit event. Do not change Appointment from `CHECKED_IN`; entering service and creating encounters are Doctor workspace responsibilities.

### Phase 6D3 — Reception Walk-in registration (Update 52)

**Status: implementation prepared; local verification pending.** No schema or migration change is included.

- Add `POST /api/reception/walk-ins`, protected by the existing `appointment.manage` permission, same-origin validation, and an active Reception role recheck inside a Serializable transaction.
- This first increment accepts only an existing active Patient ID and an active Doctor ID. If a walk-in has no Patient record yet, Reception must first use the existing patient-registration flow; this endpoint does not create a Patient, MRN, Appointment, account, delegation, or medical record.
- Require two distinct supported identity elements and compare both against the selected Patient with the existing Phase 5B matcher. Persist only identifier types, outcome, employee actor, and timestamp; never retain submitted values. A failed comparison is recorded as FAILED with a PII-minimal audit event and creates no queue ticket.
- Require both the clinic and selected doctor to be within an explicitly configured weekly schedule or active `EXTRA_HOURS` exception at the exact current Cairo-local time. A `BLOCKED` exception takes precedence. Missing schedule configuration fails closed.
- Reject walk-in registration while the doctor has an ongoing appointment or `IN_SERVICE` queue ticket, when the selected Patient already has an appointment with that doctor during the current Cairo-local day, or when the same Patient already has an active queue ticket with that doctor today.
- Reuse `allocateNextDoctorQueueNumber` inside the same transaction and shared per-doctor mutex used by appointment check-in and Call Next. Create `QueueEntry` with `type = WALK_IN`, `status = WAITING`, and no `appointmentId`; write a PII-minimal audit event atomically.
- Appointment queue tickets outrank walk-ins. A current or upcoming `CONFIRMED` appointment whose scheduled end is still ahead holds uncalled walk-ins. If a walk-in was already called and an appointment later takes priority, return that walk-in to `WAITING` with an audit event. An in-service ticket blocks another call.
- This is an API/data-layer increment only. It does not add new-patient creation inside the walk-in action, walk-in notes, queue priority overrides, appointment slot reservation, public queue display, or UI. No schema, migration, seed, package, dependency, or environment changes are included.


### Phase 6D4 — Reception no-show recording (Update 53)

**Status: complete and locally verified.** The developer confirmed all five checks passed (587 unit tests across 64 files, 84 E2E tests, typecheck, lint, and production build). No schema or migration change was included.

- Add `POST /api/reception/appointments/:appointmentId/no-show`, protected by `appointment.manage`, same-origin validation, and an active Reception-role recheck inside a Serializable transaction. The client sends only an empty JSON object; status, actor, reason, and timestamp are server-controlled.
- Allow the operation only for an appointment still in `CONFIRMED`, with no check-in timestamp, cancellation/completion timestamp, or QueueEntry. No artificial same-day restriction is added; the original appointment time remains in history.
- The 10-minute grace rule remains inclusive: exactly 10 minutes after the scheduled start is still within grace; Reception may record no-show only after more than 10 full minutes have elapsed. No automatic no-show, cancellation, fee, or penalty is introduced.
- Accept Patient Portal/Reception appointments only with their expected Patient identity state. Accept public guest appointments only with a consistent `GuestAppointmentContact`: either pending verification and unlinked, or linked to the exact Patient already attached to the appointment.
- Lock Appointment then GuestAppointmentContact and re-read the state, serializing no-show against check-in, guest management-token operations, and Reception identity resolution. Conditionally transition `CONFIRMED` → `NO_SHOW`, append `STAFF` status history, and write a PII-minimal employee audit event in the same transaction. Do not create a QueueEntry or alter an existing queue ticket.
- For an unresolved guest appointment, invalidate its management token hash in the same transaction because `NO_SHOW` is terminal. A linked guest token has already been revoked by the guest identity-link operation.
- This increment is API/data-layer only. No Reception appointment list/search UI, no queue-ticket `LEFT`/`CANCELLED`/`IN_SERVICE`/`COMPLETED` transitions, no background no-show job, no notifications, schema/migration, seed, package, dependency, or environment changes are included.
