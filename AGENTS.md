<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project map

- Next.js App Router under `src/app`; path alias `@/*` maps to `src/*` only.
- Prisma 7 + PostgreSQL. Schema is `prisma/schema.prisma`, CLI config is `prisma7.config.ts`, generated client goes to `generated/prisma/` (gitignored).
- Server-only modules (database access, secrets, privileged business logic) belong in `src/server`; shared isomorphic utilities belong in `src/lib`.

## Commands

- `npm run dev`, `npm run build` — Turbopack is the Next 16 default; there is no webpack config.
- `npm run lint` — ESLint 9 flat config with no file args (lints the whole repo).
- Type-check: `npx next typegen && npx tsc --noEmit`. Plain `tsc` fails on a fresh clone because route helpers such as `LayoutProps<"/">` live in the gitignored `.next/**/types`.
- Vitest is the unit-test runner (`npm test` for a one-shot run; `npm run test:watch` for watch mode). Keep pure unit tests under `tests/unit/`.
- Playwright is the browser E2E runner (`npm run test:e2e`). Keep browser tests under `tests/e2e/`; the configured suite uses Chromium and starts the Next.js dev server on port 3100. Install the browser once with `npx playwright install chromium`.
- Run automated tests after relevant changes. Lint, type checking, and a production build do not replace unit or E2E tests.

## Next.js 16 / Tailwind

- Consult `node_modules/next/dist/docs/` before using Next APIs you know from older versions (the managed block above requires this).
- Use `proxy.ts`, not `middleware.ts`. `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are async; type routes with generated helpers like `PageProps<'/route'>`, `LayoutProps<'/'>`, and `RouteContext<'/route'>` instead of hand-written prop types.
- Tailwind 4 runs through the `@tailwindcss/turbopack` loader configured in `next.config.ts`; there is no PostCSS config. Keep `@import "tailwindcss"` in `src/app/globals.css`.

## Prisma 7

- `prisma7.config.ts` is intentional and auto-discovered (`npx prisma validate` confirms it loads). It loads `dotenv` and supplies `DATABASE_URL` to the CLI; keep the `url` out of the schema datasource.
- The generator is `prisma-client` with output `generated/prisma`. Import it by relative path, e.g. `../../generated/prisma/client` from `src/server`; the `@/*` alias does not cover `generated/`.
- Prisma 7 requires the pg driver adapter at runtime:
  ```ts
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  ```
  Cache the client on `globalThis` so Next dev HMR does not create new pools.
- After schema edits run `npx prisma generate`; Prisma 7 `migrate dev` no longer generates the client. `migrate dev` needs a reachable Postgres and a shadow database.
- For Prisma 7 details, load the repo-local `prisma-cli` and `prisma-client-api` skills rather than relying on Prisma 5/6 behavior.

---

# MERUNO Medical Clinics — Development Rules

## 1. Project Overview

MERUNO is a medium-sized, full-stack management and appointment-booking system for a single-branch, multi-specialty outpatient clinic (Polyclinic).

The project is a portfolio/demo application, not a production medical system.

### Project characteristics

- One clinic branch.
- 8 doctors across 7 medical specialties.
- Internal laboratory.
- Internal radiology department (Digital X-ray and Ultrasound).
- Public website.
- Patient portal.
- Admin dashboard.
- Separate workspaces for medical and operational staff.
- English-only user interface.
- LTR-only layout.
- Do not add bilingual, RTL, or i18n features.

### Medical specialties

- General Internal Medicine: 2 doctors.
- Pediatrics: 1 doctor.
- Cardiology: 1 doctor.
- Orthopedics: 1 doctor.
- Dermatology: 1 doctor.
- Obstetrics & Gynecology: 1 doctor.
- ENT: 1 doctor.

A radiologist is responsible for reviewing and approving radiology reports.

### Project boundaries

Do not turn this project into a hospital management system.

The following are explicitly outside the current scope:

- Multiple branches.
- Inpatient admission and bed management.
- Emergency department management.
- Surgery, ICU, and operating rooms.
- Pharmacy management and medication inventory.
- Medical supply inventory and procurement.
- Full accounting and payroll.
- Insurance claims management.
- Online payment gateways.
- Partial payments and installments.
- Telemedicine.
- AI-based diagnosis or treatment recommendations.
- WhatsApp/SMS integrations.
- PACS/DICOM device integration.
- Direct laboratory or radiology hardware integration.
- Full equipment maintenance management.
- Automated backup and disaster-recovery modules.

Do not introduce excluded functionality unless the project owner explicitly approves a scope change.

## 2. Core Development Principles

- Follow the existing project architecture and coding conventions.
- Inspect existing files before creating new files or modifying existing implementations.
- Reuse existing components, utilities, hooks, services, and patterns whenever possible.
- Avoid duplicated business logic.
- Keep components focused and maintainable.
- Separate UI, business logic, database access, and validation appropriately.
- Avoid unnecessary abstractions and overengineering.
- Do not introduce design patterns, libraries, or architectural layers without a clear need.
- Do not rewrite working code merely to impose a personal coding preference.
- Do not make unrelated changes while implementing a requested feature.
- Prefer simple, maintainable solutions appropriate for a medium-sized project.

## 3. Agent Workflow and Permission Rules

Before implementing any feature:

1. Read the relevant project files.
2. Understand the existing implementation and dependencies.
3. Check the relevant Next.js and Prisma documentation when applicable.
4. Identify the files and database models affected.
5. Explain the proposed implementation and important side effects.
6. Wait for approval when the change affects architecture, database structure, security, or project scope.

### Approval required before

- Adding or removing dependencies.
- Changing the application architecture.
- Changing authentication or authorization mechanisms.
- Changing database models or relationships.
- Creating or applying database migrations.
- Deleting existing files or data.
- Changing environment configuration.
- Introducing external services.
- Implementing functionality outside the agreed project scope.

### General rules

- Do not assume a feature is required simply because it is common in other clinic systems.
- Do not silently make product or operational policy decisions.
- Do not invent business rules when they have not been agreed upon.
- Ask one focused question when an essential business rule is genuinely unknown.
- In Plan mode, analyze and propose changes without modifying project files.
- In implementation mode, follow the approved plan.
- Never claim a feature is implemented or tested unless it actually is.

## 4. TypeScript and React Rules

- Use TypeScript throughout the application.
- Prefer explicit types for important business entities, function parameters, and return values.
- Avoid `any`; use proper types or `unknown` with appropriate narrowing.
- Avoid unnecessary type assertions.
- Reuse shared types where appropriate.
- Keep React components focused on their responsibilities.
- Use hooks according to React rules.
- Avoid unnecessary state and effects.
- Do not duplicate server data in client state without a reason.
- Keep reusable UI components independent of specific business workflows when possible.
- Avoid large components containing unrelated functionality.

## 5. Next.js Application Rules

- Use the App Router under `src/app`.
- Follow the installed Next.js 16 documentation.
- Prefer Server Components by default.
- Use Client Components only when browser interaction or client-side state requires them.
- Keep database access and sensitive business logic on the server.
- Never import server-only database modules into Client Components.
- Follow the existing route handlers, server actions, and data-fetching patterns in the project.
- Do not mix different data-fetching approaches without a clear reason.
- Keep loading, error, and empty states consistent.
- Protect private routes and server-side operations.
- Never rely on hiding UI elements as an authorization mechanism.

## 6. Project Structure

- Keep application routes inside `src/app`.
- Put reusable components in the existing shared components structure.
- Keep database access in server-only modules.
- Keep shared validation and business utilities in appropriate reusable locations.
- Keep authentication and authorization logic centralized.
- Avoid placing database queries directly inside presentation components.
- Do not create new top-level folders or reorganize the project without approval.
- Respect the existing `@/*` alias limitations.
- Do not manually edit generated Prisma client files.

## 7. Database and Prisma Rules

- Use Prisma 7 only.
- PostgreSQL is the database.
- Follow the existing Prisma 7 configuration and PostgreSQL adapter setup.
- Read the installed repository-local Prisma skills before using Prisma CLI or Client APIs.
- Keep the Prisma schema in `prisma/schema.prisma`.
- Generated client output belongs to `generated/prisma/`.
- Never edit generated client files manually.
- Keep database access on the server.
- Use transactions for operations that require multiple related database changes to succeed or fail together.
- Use database constraints and indexes where appropriate.
- Avoid unnecessary database queries and N+1 query patterns.
- Select only the fields needed for each operation.
- Do not expose internal database records directly to the client when a safe response shape is needed.
- Validate input before database operations.
- Do not rely only on frontend validation.
- Preserve referential integrity.
- Avoid hard deletion of important medical and financial records.
- Use explicit status and audit history where the business workflow requires it.
- Do not introduce database models or relations without understanding their purpose and lifecycle.

### Schema and migration safety

Before changing the Prisma schema:

1. Inspect existing models and relations.
2. Identify affected features and existing records.
3. Explain the proposed schema change.
4. Obtain approval.
5. Update the schema.
6. Run Prisma validation and generation.
7. Create migrations only when explicitly approved and the database is available.
8. Check the affected application code and types.

Never reset or drop the database to resolve a migration problem without explicit approval.

## 8. Authentication and Authorization

The application contains multiple user types.

Expected roles:

- Admin
- Clinic Manager
- Receptionist
- Doctor
- Nurse
- Laboratory Staff
- Radiology Staff
- Radiologist
- Cashier
- Patient

### Authorization rules

- Apply role-based access control (RBAC).
- Follow the least-privilege principle.
- Authorization must be enforced on the server.
- Every protected operation must verify the authenticated user and their permissions.
- Never trust a role, patient ID, doctor ID, or permission supplied by the client.
- Users must not access records merely by changing an ID in a URL or request.
- Doctors can access records associated with their assigned patients and authorized referrals.
- Receptionists can manage appointment and basic patient information but cannot access private clinical notes.
- Cashiers can access financial information without unnecessary access to clinical details.
- Laboratory and radiology staff can access only the information required for their workflows.
- Patients can access their own records and records they are explicitly authorized to manage.
- A parent or guardian may access linked minor records according to the approved relationship and authorization.
- Booking an appointment for another adult does not grant access to that adult's medical record.
- Administrative emergency access must be temporary, justified, and audited.
- Deactivated employees must not retain access to the application.
- Never expose passwords, tokens, secrets, or sensitive authentication information.

## 9. Medical Data and Patient Privacy

This is a medical-domain application, so confidentiality and data integrity are critical.

- Use synthetic demo data only.
- Never insert real patient medical records into the repository.
- Do not use real patient names, phone numbers, addresses, or medical documents in seed data.
- Make it clear in the project documentation that the application is a demo using synthetic data.
- Do not expose sensitive medical information in URLs.
- Do not log passwords, access tokens, or unnecessary medical details.
- Protect medical attachments and reports from public access.
- Verify authorization before viewing or downloading medical files.
- Validate uploaded file type and size.
- Do not allow executable files.
- Keep sensitive operations auditable.
- Do not claim the demo is legally certified, production-ready, or GAHAR-accredited.

### Medical record integrity

- Each patient has a unique Medical Record Number (MRN).
- Phone numbers are not unique patient identifiers.
- Avoid creating duplicate patient records.
- Use at least two identifiers when verifying patient identity for clinical procedures.
- Keep the permanent patient medical profile separate from individual medical encounters.
- Preserve approved encounter records.
- Never silently modify or delete an approved medical record.
- Corrections must preserve the previous value, correction reason, actor, and timestamp.
- Unknown information must not be treated as a confirmed negative medical finding.
- Record the author and timestamp of important clinical entries.

## 10. Appointment Management Rules

Appointments must follow the approved business workflow.

### Booking

- Patients can book using an account or as guests.
- Guest booking does not automatically grant access to medical records.
- Parents or guardians can book for linked children.
- Adults can book for another adult without gaining access to their medical records.
- A successful booking is automatically confirmed.
- Patients select a specialty, doctor, date, and available time.
- Only valid available slots can be booked.
- The system must prevent overlapping appointments for the same doctor.
- The system must prevent overlapping confirmed appointments for the same patient.
- Do not allow overbooking in the current scope.
- Walk-in patients can be accepted when capacity allows without disrupting existing appointments.

### Concurrency

- Prevent two users from booking the same slot simultaneously.
- Do not rely on frontend availability checks alone.
- Recheck availability on the server during booking.
- Use appropriate database transactions and constraints to protect booking integrity.
- Return a clear conflict response when a slot is no longer available.

### Scheduling

- Each doctor has an independent working schedule.
- Appointment duration depends on the doctor and service.
- Authorized staff can manage working hours, holidays, and exceptions.
- Do not allow appointments outside the configured schedule.
- Do not allow overlapping appointments for the same doctor.

### Appointment policies

- Patients should arrive 15 minutes before their appointment.
- A 10-minute grace period is allowed.
- Late patients are not automatically cancelled.
- Reception decides whether a late patient can still be accommodated.
- Cancellation and rescheduling through the patient portal are available at least 24 hours before the appointment.
- Requests inside the 24-hour period are handled by reception.
- No automatic cancellation fee or no-show fee exists in the current scope.
- No-show must be recorded by authorized staff.
- Follow-up validity and pricing vary by doctor and service.

### Appointment statuses

Use the agreed appointment lifecycle:

- CONFIRMED
- CHECKED_IN
- WAITING
- IN_CONSULTATION
- COMPLETED
- CANCELLED
- NO_SHOW

Do not introduce additional statuses without an approved business requirement.

Record important status transitions with actor and timestamp.

## 11. Waiting Queue

- Maintain a separate waiting queue for each doctor.
- Booked patients enter according to their appointment schedule.
- Walk-in patients enter when capacity is available.
- Authorized medical staff may prioritize urgent cases after clinical assessment.
- Reception can monitor queue position and patient status without accessing private clinical details.
- Use queue numbers instead of patient names on public waiting displays.
- Track check-in, waiting, consultation start, and completion times where appropriate.

## 12. Medical Encounter Rules

An appointment and a medical encounter are different concepts.

- An appointment represents a scheduled visit.
- An encounter represents the actual clinical interaction.

### Encounter workflow

- The responsible doctor opens the encounter.
- The doctor can save a draft.
- The doctor can complete and approve the encounter.
- Approved records cannot be silently edited.
- Corrections must be recorded as auditable amendments.

### Clinical note structure

Follow the approved clinical note structure:

- Chief Complaint
- History of Present Illness
- Medical History
- Current Medications
- Allergies
- Physical Examination
- Vital Signs
- Diagnosis
- Assessment
- Treatment Plan
- Investigations
- Follow-up
- Patient Instructions

Additional specialty-specific fields may be added when necessary.

Do not create entirely separate encounter systems for each specialty.

### Diagnosis

- Support one primary diagnosis.
- Support additional secondary diagnoses.
- Provide searchable diagnosis options when available.
- Allow manual entry when appropriate.
- Do not introduce AI diagnosis.
- Only authorized doctors can add or approve diagnoses.

### Medication review

- Review current medications and allergies during the encounter.
- Record relevant medication changes.
- Do not introduce a pharmacy or medication inventory.
- Do not invent medication or treatment recommendations.

### Patient education

- Allow doctors to record patient instructions and education.
- Include relevant medication instructions, preparation instructions, warning signs, and follow-up guidance.
- Make approved instructions available through the patient portal.

## 13. Prescriptions

- Doctors enter medication details manually.
- No medication catalog is required.
- No pharmacy or drug inventory module is required.
- A prescription may contain multiple medication entries.
- Record medication name, strength, dosage form when applicable, dose, route, frequency, duration, quantity, and instructions.
- Record the prescribing doctor and prescription date.
- Prescriptions must be linked to the relevant encounter.
- Patients can view and download approved prescriptions as PDF.
- Do not add automated drug interaction or AI prescribing features.

## 14. Laboratory Workflow

The internal laboratory supports a medium-sized set of routine tests.

Expected workflow:

1. Doctor creates a laboratory order.
2. Staff verify patient identity and preparation requirements.
3. Sample collection is recorded with collector and time.
4. Samples can be accepted or rejected with a documented reason.
5. Staff perform the test.
6. Results are entered with units and reference ranges where applicable.
7. Authorized personnel review and approve the result.
8. Approved results become available to the patient.
9. The ordering doctor receives a task to review the result.
10. Critical results follow the approved urgent communication and escalation workflow.

### Laboratory rules

- Each order and sample must be traceable.
- Record collection and processing timestamps.
- Support routine and urgent (STAT) priority.
- Track turnaround time.
- Do not expose unapproved results to patients.
- Do not claim integration with laboratory hardware.
- External laboratory tests use the approved external referral workflow.

## 15. Radiology Workflow

Current scope:

- Digital X-ray.
- Ultrasound.

Do not add CT, MRI, mammography, or PACS/DICOM integration to the current scope.

### Radiology workflow

1. Doctor creates a radiology order and records the reason.
2. Staff review the request.
3. Preparation requirements are communicated.
4. Appointment is scheduled based on room/device availability.
5. Patient identity is verified before the procedure.
6. Staff record the examination and responsible personnel.
7. Radiologist prepares and reviews the report.
8. Authorized radiologist approves the report.
9. Approved report becomes available to the patient.
10. Ordering doctor receives a review task.

### Radiology safety

- Record pregnancy screening before X-ray when applicable.
- Uncertain pregnancy status requires appropriate clinical review before proceeding.
- Critical findings must follow the approved urgent communication workflow.
- Do not claim direct imaging-device integration.

## 16. Results Follow-up

- Completing an encounter does not automatically mean all requested investigations are complete.
- Each laboratory or radiology order has its own status.
- Approved results must be routed to the responsible ordering doctor.
- The doctor must document review and the resulting decision.
- A result is not considered fully followed up merely because a report was uploaded.
- When the ordering doctor is unavailable, an authorized qualified replacement can be assigned.
- Critical results must follow immediate escalation, not ordinary reminders.

## 17. Internal and External Referrals

### Internal referrals

- Doctors can refer patients to another specialty within the clinic.
- Record referral reason and priority.
- Link the referral to the originating encounter.
- Reception can schedule the referred appointment.
- The receiving doctor can access the authorized referral information.
- Record the receiving doctor's findings and recommendations.
- The original doctor can review the referral outcome.
- Track referral status.

### External referrals

- Record the external provider and referral details.
- Share only necessary information with patient authorization.
- External providers receive payment directly from the patient.
- Authorized staff can upload returned external reports.
- The responsible doctor reviews the returned report.

## 18. Billing and Payments

- Use a centralized service catalog.
- Services include consultations, laboratory tests, and radiology examinations.
- Prices can vary by doctor or service.
- Previous invoices must retain their original prices.
- Authorized management can update prices.
- Discounts require authorized manager approval and a recorded reason.
- Invoices may contain multiple service line items.

### Payment methods and settlement

- Cash.
- Bank card through an in-clinic POS terminal.
- Clinic-supported electronic wallets accepted at the clinic.
- Do not add an online payment gateway.

### Payment rules

- Payment is collected after the service is delivered.
- Full payment only. Do not implement partial payments or installments.
- Discounts require authorized manager approval and a recorded reason.
- Refunds require manager approval.
- A specific invoice item that was not provided may be refunded without cancelling the other invoice items.
- Preserve the original invoice and record the refund details. Do not delete or overwrite an issued invoice.
- Do not add insurance claims management.

## 19. Phase Boundaries

- Phase 1 — Foundation: documentation, environment template, design foundation, shared UI primitives, public application shell, server-only Prisma foundation, Zod validation foundation, and test tooling. Do not build domain features.
- Phase 2 — Domain database schema and migrations: domain models, relations, migrations, and demo seed data.
- Phase 3 — Authentication and authorization: Better Auth integration, authentication, the role and permission model, protected workspaces, and the authenticated data access layer.
- Phase 10 — Complete public website and patient portal.
- Do not skip phases or implement later-phase features early.

## 20. Server-Only Code and Data Access

- Keep database access, secrets, and privileged business logic in server-only modules under `src/server`.
- Never import server-only modules into Client Components.
- Use a single `PrismaClient` instance with the pg adapter, cached on `globalThis` in development so HMR does not create new pools.
- Never call Prisma from Client Components.
- Keep Prisma queries inside server-only modules, not inline in presentation components.
- Phase 1 may include a server-only database health check under `src/server/health`. It is not the authenticated data access layer.
- Phase 3 adds the authenticated data access layer. Every function must verify the authenticated actor, authorization scope, record ownership or staff assignment, guardian or delegation relationship where applicable, and record state before returning data.
- Return minimal, safe DTOs instead of raw Prisma records.
- Every Server Action and Route Handler must independently authenticate and authorize. Do not rely on `proxy.ts` or hidden UI.
- Never trust a role, user ID, patient ID, doctor ID, or permission supplied by the client.

## 21. Environment, Validation, and Secrets

- Keep secrets in `.env`. Never commit `.env`, print its values, or expose them to the client.
- Only browser-safe values may use the `NEXT_PUBLIC_` prefix.
- Validate environment variables on the server with Zod 4 before use.
- Validate external input with shared Zod 4 schemas on the server. Client-side validation is a convenience, not the authoritative check.
- Do not log secrets, tokens, passwords, full request bodies, or unnecessary medical details.
- Return stable, user-safe error messages. Do not expose stack traces, SQL, internal identifiers, or PHI.
- Do not read or change `.env` as part of an unrelated task.

## 22. Approved Technology and UI Direction

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 through `@tailwindcss/turbopack`, Node.js 22.12+ (required by the selected Vitest 4 setup; Node.js 22 LTS), PostgreSQL, Prisma 7, and `@prisma/adapter-pg`.
- Do not replace the Tailwind Turbopack integration with PostCSS.
- Use shadcn/ui with Base UI as the component base.
- Use Inter Variable from a self-hosted Fontsource package.
- Approved MERUNO colors: primary `#176B67`, secondary `#8CBDB4`, background `#F5F8F7`, surface `#FFFFFF`, text `#24343B`, border `#E8EEED`.
- English-only and LTR-only. Do not add language switching, translation dictionaries, or RTL layout support.
- Vitest is approved for unit tests and Playwright is approved for browser E2E tests. Keep unit tests in `tests/unit/` and browser tests in `tests/e2e/`. Run `npm test` and `npm run test:e2e` as appropriate; do not claim the suite passes unless those commands have been executed successfully.
- Do not add a global state library, microservices, a separate backend, or premature infrastructure.
- Better Auth is a provisional Phase 3 choice. Do not install or configure it in Phase 1.
