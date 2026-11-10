# MERUNO Medical Clinics

MERUNO is a portfolio/demo full-stack application for managing a single-branch, multi-specialty outpatient clinic (polyclinic). The approved target includes a public clinic website, patient portal, and separate workspaces for clinical and operational staff.

> **Demo and safety notice**
>
> This is a portfolio project, not production clinical software. Use synthetic demo data only. Never commit real patient information, medical records, credentials, API keys, or other protected information. The project is not clinically certified or accredited and must not be represented as a production-ready medical system.

## Current implementation status

| Area | Current status |
| --- | --- |
| Phase 0 — Planning and technical direction | Complete |
| Phase 1 — Project Foundation (Steps 1–9) | Complete and locally verified: project documentation, environment/tooling, UI foundation, public shell, Prisma health route, shared Zod validation, Vitest, and Playwright. |
| Phase 2A–2D — Domain schema | Complete: 57 clinic-domain models across master data/patients, appointments/clinical records, laboratory/radiology, and billing/operations. |
| Phase 2E — Migration and seed foundation | Final migration-preview generator, PostgreSQL integrity logic, and synthetic seed workflow finalized in Updates 11–13. The developer's local migration state is authoritative; use `npx prisma migrate status` to inspect it, and never reset the database to resolve an issue. |
| Phase 3A — Auth schema | Complete: Better Auth identity, explicit employee/patient links, employee role assignments, and patient access grants. |
| Phase 3B — Better Auth integration | Complete: server instance, API handler, auth client, session helper, and environment validation. |
| Phase 3C — Sign-in and initial System Admin bootstrap | Complete: login/sign-out, account status, and controlled local bootstrap. |
| Phase 3D — Account linking | Complete: employee and patient linking APIs with verification and audit controls. |
| Phase 3E — Authorization core | Complete and locally verified: shared role/permission policy, verified actor resolution, and scoped patient delegation checks. |
| Phase 3F — Protected routes and authenticated data access | Complete and locally verified in Update 23: shared Route Handler guards, workspace-entry policy, and server-only data-access wrappers. |
| Phase 3G-A — Patient sign-up and email lifecycle | Complete and locally verified after Update 24 Fix 01: verified registration, email verification, password recovery, and password changes. |
| Phase 3G-B1 — Verified email change | Complete and locally verified after Update 25 Fix 01: two-address confirmation and atomic synchronization with linked employee/patient email records; all five checks passed (51 unit, 14 E2E). |
| Phase 3G-B2 — Controlled employee invitations | Complete and locally verified after Update 26 Fix 03: 64 unit tests and 17 E2E tests passed. |
| Phase 3G-C — Guardian/adult delegation operations | Complete and locally verified after Update 27: 86 unit tests and 22 E2E tests passed, with typecheck, lint, and production build. |
| Phase 4A — Consultation-room database foundation | Complete after Update 28 and Fix 01: three migrations confirmed up to date; 89 unit tests and 22 E2E tests passed along with typecheck, lint, and build. |
| Phase 4B1 — Clinic weekly working hours and local-time foundation | Complete and locally verified after Update 29: fourth migration applied; 98 unit tests and 22 E2E tests passed with typecheck, lint, and production build. |
| Phase 4B2 — Doctor schedule and clinic-hours integrity | Complete after Update 30: developer confirmed five migrations up to date and all five checks passed (107 unit, 22 E2E). |
| Phase 4C — Specialty, doctor profile, service, duration, and EGP price administration | Complete — Update 31 and Fix 01; locally verified: 131 unit tests and 24 E2E tests, typecheck, lint, and production build. |
| Phase 4D — Laboratory and radiology catalog/resource administration | Complete and locally verified after Update 32: 157 unit tests and 26 E2E tests passed with typecheck, lint, and production build. |
| Phase 5A — Patient registration and duplicate prevention | Complete and locally verified after Update 33 Fix 01: 185 unit tests and 28 E2E tests passed with typecheck, lint, and production build. |
| Phase 5B — Patient identity verification | Complete and locally verified after Update 34: 204 unit tests and 29 E2E tests passed with typecheck, lint, and production build. |
| Phase 5C — Patient contacts and consents | Complete — Update 35 + Fix 01; developer confirmed six migrations up to date, 259 unit tests, 33 E2E tests, typecheck, lint, and production build passed. |
| Phase 5D — Patient attachments and documents | Complete — Update 36 + Fixes 01–02; locally verified: 287 unit tests, 36 E2E tests, typecheck, lint, and production build passed. |
| Phase 5E — Family relationships and guardian workflows | Complete and locally verified after Update 38: migration 8 applied, database up to date, 315 unit tests, 42 E2E tests, typecheck, lint, and production build passed. |
| Phase 6A — Public appointment availability foundation | Complete and locally verified after Update 39: 332 unit tests and 45 E2E tests passed with typecheck, lint, and production build. |
| Phase 6B1 — Authenticated patient booking | Complete and locally verified after Update 40: 356 unit tests and 46 E2E tests passed with typecheck, lint, and production build. |
| Phase 6B2 — Public guest appointment booking | Complete and locally verified after Update 41 + Fix 01: migration 9 applied, database up to date, 378 unit tests and 49 E2E tests passed with typecheck, lint, and production build. |
| Phase 6B3A — Reception booking for existing patients | Complete and locally verified after Update 42: 390 unit tests and 51 E2E tests passed with typecheck, lint, and production build. |
| Phase 6B3B — Guest appointment identity resolution | Complete and locally verified after Update 43: 406 unit tests across 44 files, 53 E2E tests, typecheck, lint, and production build passed. |
| Phase 6B3C — Audited same-patient overlap exception | Complete and locally verified after Update 44: migration 10 applied; 425 unit tests, 53 E2E tests, typecheck, lint, and production build passed. |
| Phase 6C1 — Patient self-service cancellation | Complete — Update 45; developer confirmed 440 unit tests, 55 E2E tests, typecheck, lint, and production build passed. |
| Phase 6C2 — Patient self-service rescheduling | Complete — Update 46; developer confirmed 458 unit tests across 51 files, 57 E2E tests, typecheck, lint, and production build passed. |
| Phase 6C3 — Guest self-service cancellation | Complete — Update 47; developer confirmed 475 unit tests across 53 files, 62 E2E tests, typecheck, lint, and production build passed. |
| Phase 6C4 — Guest self-service rescheduling | Complete — Update 48; developer confirmed 495 unit tests across 55 files, 66 E2E tests, typecheck, lint, and production build passed. |
| Phase 6C5 — Reception appointment cancellation and rescheduling | Complete and locally verified — Update 49; 511 unit tests across 57 files, 70 E2E tests, typecheck, lint, and production build passed. |
| Phase 6D1 — Reception check-in and appointment queue entry | Complete — Update 50; 528 unit tests, 72 E2E tests, typecheck, lint, and production build passed. |
| Phase 6D2 — Reception queue board and Call Next | Complete — Update 51; developer confirmed 538 unit tests, 76 E2E tests, typecheck, lint, and production build passed. |
| Phase 6D3 — Reception Walk-in registration | Complete — Update 52; 561 unit tests across 62 files, 80 E2E tests, typecheck, lint, and production build passed. |
| Phase 6D4 — Reception no-show recording | Complete — Update 53; developer confirmed 587 unit tests across 64 files, 84 E2E tests, typecheck, lint, and production build passed. |
| Phase 7A — Doctor queue worklist | Complete — Update 54; the developer confirmed 593 unit tests across 65 files, 86 E2E tests, typecheck, lint, and production build passed. |
| Phase 7B — Doctor starts consultation | Complete — Update 55; developer confirmed 613 unit tests across 66 files, 89 E2E tests, typecheck, lint, and production build passed. |
| Phase 7C — Doctor clinical-note draft | Complete — Update 56; developer confirmed 640 unit tests across 68 files, 92 E2E tests, typecheck, lint, and production build passed. |
| Phase 7D — Doctor Encounter diagnoses | Complete and locally verified after Update 57 Fix 01: 669 unit tests and 96 E2E tests passed with typecheck, lint, and production build. |
| Phase 7E — Doctor prescription drafts | Complete and locally verified — Update 58; migration 11 applied and database up to date; 717 unit tests across 73 files, 101 E2E tests, typecheck, lint, and production build passed. |
| Phase 7F — Doctor laboratory test orders | Complete and locally verified after Update 59 Fix 01: 751 unit tests across 75 files, 105 E2E tests, typecheck, lint without warnings, and production build passed. |
| Phase 7G — Doctor radiology orders | Complete — Update 60; migration 12 applied, 800 unit tests, 109 E2E tests, typecheck, lint, and production build confirmed by the developer. |
| Phase 7H — Doctor referral creation/history | Complete and locally verified after Update 61: 836 unit tests across 80 files, 112 E2E tests, typecheck, lint, and production build passed. |
| Phase 7I — Doctor referral inbox/lifecycle | Complete — Update 62; 869 unit tests across 82 files, 116 E2E tests, typecheck, lint, and production build passed. |
| Phase 7J — Doctor prescription issuance | Complete — Update 63; 880 unit tests across 83 files, 120 E2E tests, typecheck, lint, and production build passed. |
| Phase 7K — Doctor clinical-note signing | Complete and locally verified — Update 64; 901 unit tests across 85 files, 124 E2E tests, typecheck, lint, and production build all passed. |
| Phase 7L — Doctor clinical-note amendments | Current increment — Update 65 adds append-only corrections to the original Doctor's signed initial assessment using the existing ClinicalAmendment model; local verification pending. |
| Phase 7 onward | Remaining vital-sign and Nurse workflows, prescription correction/version history, referral follow-up, Encounter completion, Doctor/Nurse UIs, lab/radiology processing and exam workflows, billing, public website/portal, management/admin, and integrated release remain planned. |

The project has completed the technical foundation, domain database design, authentication/authorization, all of Phase 4, and Phase 5A–5E. Phase 7A–7K are complete: Update 54 passed all five checks (593 unit, 86 E2E), Update 55 passed all five checks (613 unit, 89 E2E), Update 56 passed all five checks (640 unit, 92 E2E), Update 57 + Fix 01 passed all five checks (669 unit, 96 E2E), Update 58 passed all five checks (717 unit, 101 E2E) after migration 11 was applied and the database was confirmed up to date, and Update 59 + Fix 01 passed all five checks (751 unit across 75 files, 105 E2E, typecheck, clean lint, and production build). Update 60 completed Phase 7G Doctor-owned radiology catalog search and Encounter-scoped order creation. The developer confirmed migration 12 applied and all five local checks passed (800 unit tests, 109 E2E tests, typecheck, lint, and production build). Update 61 completed Phase 7H Doctor referral creation/history; the developer confirmed 836 unit tests across 80 files, 112 E2E tests, typecheck, lint, and production build passed. Update 62 completed Phase 7I Doctor referral inbox/lifecycle actions; the developer confirmed all five local checks passed (869 unit tests across 82 files, 116 E2E tests, typecheck, lint, and production build). Update 63 completed Phase 7J Doctor prescription issuance; the developer confirmed all five local checks passed (880 unit tests across 83 files, 120 E2E tests, typecheck, lint, and production build). Update 64 completed Phase 7K Doctor clinical-note signing; the developer confirmed all five local checks passed (901 unit tests across 85 files, 124 E2E tests, typecheck, lint, and production build). Update 65 introduces Phase 7L Doctor clinical-note amendments; local verification is pending. Update 27 completed the server-side guardian/adult patient-delegation lifecycle. Updates 28–32 completed Phase 4A–4D, reusing the existing rooms, clinic/doctor schedules, service catalog, and diagnostic catalog. Updates 33–38 completed Phase 5A–5E. Update 38 applied migration 8 (`20261108050000_patient_relationship_lifecycle`); the developer confirmed eight migrations up to date, 315 unit tests, 42 E2E tests, typecheck, lint, and production build passed. Phase 6A (Update 39) implemented and passed local verification for the read-only public availability endpoint (332 unit and 45 E2E tests). Update 40 completed Phase 6B1 with a serializable patient-portal booking transaction for self-booking or an exact active `BOOK_APPOINTMENTS` grant; the developer confirmed 356 unit tests, 46 E2E tests, typecheck, lint, and production build passed. Update 41 completed Phase 6B2 with public guest booking using a dedicated provisional `GuestAppointmentContact` record, not a fabricated Patient/MRN. The developer applied migration 9 (`20261108060000_guest_appointment_identity`), confirmed nine migrations up to date, and passed all five checks after Fix 01: 378 unit tests, 49 E2E tests, typecheck, lint, and production build. The guest API uses the same availability/transaction checks and a one-time bearer management token whose hash is stored. Deferred database triggers require Reception to verify two distinct identity elements and link the exact Patient before check-in, queue, or clinical work. Update 42 completed Phase 6B3A after local verification: Reception booking for an existing active Patient is permission-guarded, transactionally revalidates the slot, and preserves all overlap exclusions; 390 unit tests and 51 E2E tests passed with typecheck, lint, and build. Update 43 completed Phase 6B3B by resolving a confirmed public guest appointment to an exact existing active Patient only after two distinct stored identity elements match. The developer verified all five checks: 406 unit tests across 44 files, 53 E2E tests, typecheck, lint, and production build. Update 44 completed Phase 6B3C with a separate `appointment.patient-overlap.override` permission assigned only to Reception, four bounded operational reason codes, immutable transaction-bound audit rows for each exact conflicting appointment pair, and PostgreSQL enforcement for both new Reception bookings and guest-to-Patient linking. The developer applied migration 10 and confirmed all five checks: 425 unit tests, 53 E2E tests, typecheck, lint, and production build. Migration 10 replaces only the patient overlap exclusion with a pair-specific deferred trigger protected by a per-patient write mutex (including both sides of patient reassignment); doctor and room exclusion constraints remain unchanged. Update 45 completed Phase 6C1 with patient self-service cancellation for linked appointments at least 24 hours ahead; the developer confirmed 440 unit tests across 49 files, 55 E2E tests, typecheck, lint, and production build passed. Update 46 completed Phase 6C2 patient self-service rescheduling, limited to a new date/time for the same doctor and service while preserving the original duration and booked-price snapshot; the developer confirmed 458 unit tests across 51 files, 57 E2E tests, typecheck, lint, and production build passed. Update 47 completed Phase 6C3 guest self-service cancellation using the hashed bearer management token, the existing unresolved-guest boundary, an inclusive 24-hour rule, transactional token revocation, and an EXTERNAL audit event; the developer confirmed 475 unit tests across 53 files, 62 E2E tests, typecheck, lint, and production build passed. Update 48 completed Phase 6C4 guest self-service rescheduling with the same unresolved-guest token boundary, an inclusive 24-hour rule, server-side slot/room revalidation, lifecycle history, and an EXTERNAL audit event; the developer confirmed 495 unit tests across 55 files, 66 E2E tests, typecheck, lint, and production build passed. Update 49 completed Phase 6C5 Reception cancellation and rescheduling for upcoming confirmed appointments, with active Reception permission rechecks, bounded reason codes, Patient/guest identity consistency, per-patient scheduling locks, slot/room revalidation, staff history and audit events; the developer confirmed 511 unit tests across 57 files, 70 E2E tests, typecheck, lint, and production build passed. Update 50 completed Phase 6D1 Reception check-in: two-element identity verification, active Patient and guest-link checks, Cairo-local appointment-day validation, explicit Reception acceptance after the 10-minute grace period, and atomic CHECKED_IN plus WAITING QueueEntry creation with serialized per-doctor/day ticket numbers. The developer confirmed all five checks: 528 unit tests across 59 files, 72 E2E tests, typecheck, lint, and production build passed. Update 51 completed Phase 6D2 with a Reception-only current-day doctor queue API and atomic Call Next operation; the developer confirmed 538 unit tests, 76 E2E tests, typecheck, lint, and production build passed. Update 52 completed Phase 6D3 existing-patient Walk-in registration with two-element identity verification, explicit current clinic/doctor schedule checks, shared per-doctor queue-number allocation, and appointment-over-Walk-in priority in Call Next; the developer confirmed 561 unit tests across 62 files, 80 E2E tests, typecheck, lint, and production build passed. Update 53 completed Phase 6D4 explicit Reception no-show recording; the developer confirmed all five checks passed (587 unit tests across 64 files, 84 E2E tests, typecheck, lint, and production build). Public registration still creates no clinic patient or employee records, and invitation acceptance links only an existing active Employee after the invited email is verified. It does not create an employee record or assign roles. Update 54 completed Phase 7A with the Doctor-only current-day queue worklist API; the developer confirmed all five checks passed (593 unit tests across 65 files, 86 E2E tests, typecheck, lint, and production build). Update 55 completed Phase 7B with a Doctor-only atomic start-consultation operation, source-specific Encounter linkage, appointment status history, and one-active-consultation-per-Doctor enforcement; the developer confirmed 613 unit tests, 89 E2E tests, typecheck, lint, and production build passed. The system remains a portfolio/demo application, not production clinical software; the Doctor UI, remaining encounter workflows, Nurse workspace, remaining domain workflows, complete public website, and patient portal are still to be implemented.

See [the implementation roadmap](docs/implementation-roadmap.md) for the full delivery-part structure and detailed phase status.

## Approved clinic scope

- One clinic branch.
- Eight doctors across seven specialties: General Internal Medicine (2), Pediatrics, Cardiology, Orthopedics, Dermatology, Obstetrics & Gynecology, and ENT.
- An internal laboratory.
- Internal radiology limited to digital X-ray and ultrasound, with radiologist review and approval of reports.
- A public website, patient portal, and role-specific staff workspaces.
- Arabic and English UI from the beginning, with RTL/LTR layout support. Keep translations and directionality consistent across public pages, patient portal, and staff workspaces.

### Important operational rules

- Patient access is limited to the patient's own information and explicitly authorized delegated access.
- Reception must not see medical details. Nurses record observations and tasks but do not independently diagnose or prescribe.
- Appointment conflicts and overbooking must be prevented, including concurrent booking attempts. Patient self/delegated booking requires the exact `BOOK_APPOINTMENTS` scope; a family relationship alone grants no authority. Confirmed appointments must not be displaced by walk-ins.
- Self-service cancellation/rescheduling is allowed at least 24 hours before the appointment; later changes go through reception.
- Encounters are drafted and approved by doctors. Approved records are never silently overwritten or deleted; corrections preserve history, reason, actor, and timestamp.
- Lab and radiology results require the defined review/approval workflow before release. Critical lab results require acknowledgment and escalation.
- Billing supports cash, POS card, and clinic-supported electronic wallets. Full payment only after service; no installments or partial payments. Discounts and refunds require manager approval. Preserve original invoices and record refunds.
- Demo information must remain synthetic.
- Patient-level administrative attachments are Reception-only in Phase 5D. Local file storage is outside the project and disabled in production until a persistent private storage adapter is configured.
- A recorded family relationship does not grant patient-portal or medical-record access. Legal guardianship must be explicitly staff-verified against an existing private patient document; separate patient-access grants and scopes remain required. Revoking guardian verification also revokes active/pending delegated grants for that directed relationship. Update 38 extends lifecycle controls: correcting a verified guardian relationship forces fresh guardian verification, while deactivation preserves the row, removes current guardian status, revokes linked grants, and blocks subsequent delegated access.

### Excluded from the current scope

Multiple branches, inpatient care, an emergency department, surgery/ICU/operating rooms, pharmacy inventory, full accounting/payroll, insurance claims, online payment gateways, installments, telemedicine, AI diagnosis/treatment recommendations, paid SMS/WhatsApp integrations, PACS/DICOM, device integrations, and advanced backup/disaster-recovery modules.

## Technology stack

Versions below are declared or locked in the project package files supplied with this source package. The exact local runtime should be reconfirmed with `node -v` and `npm ls --depth=0` on the development machine.

| Area | Technology |
| --- | --- |
| Runtime | Node.js 22.12 or newer; npm |
| Framework | Next.js 16.4.4 App Router |
| UI runtime | React 19.3.0, React DOM 19.3.0 |
| Language | TypeScript 5.9.3 |
| Styling | Tailwind CSS 4.3.4 through `@tailwindcss/turbopack` |
| UI primitives | shadcn/ui with Base UI; six local primitives: Button, Card, Input, Label, Badge, Separator |
| Typography | Inter Variable from local Fontsource package |
| Database | PostgreSQL |
| ORM | Prisma 7.10.1, `@prisma/adapter-pg`, and `pg` |
| Authentication | Better Auth 1.7.18 with the Prisma adapter |
| Server safeguards and validation | `server-only`; Zod 4.6.7 for environment and shared input validation |
| Linting | ESLint 9 with `eslint-config-next` |

Vitest and Playwright are installed as Phase 1 testing tools. Better Auth is installed and integrated in Phase 3B. See the Phase 3A–3G roadmap breakdown for the current authentication and authorization status.

## Local setup

1. Install Node.js 22.12 or newer and npm.
2. From the project root, install the locked dependencies:

   ```bash
   npm ci
   ```

   For the Step 9 dependency setup, use the pinned versions in the current package.json and run `npm install` once to update `package-lock.json`.

3. Create the local environment file by copying the example:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Edit `.env` locally and replace the fake `DATABASE_URL` with the PostgreSQL connection string for your own database. Never paste that value into chat, screenshots, GitHub, or logs.
5. Validate the Prisma schema and generate the client:

   ```bash
   npm run db:validate
   npm run db:generate
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000`. The implemented database health endpoint is `http://localhost:3000/api/health`. Run `npm run health:check` in a second terminal while the dev server is running to verify its response.

The uploaded project package intentionally excludes `.env` and `.git`. Keep your real `.env` and existing local Git repository when applying update ZIPs. The included `.env.example` contains only a fake local placeholder.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js in development mode with the existing Turbopack setup. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve a completed production build. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run `next typegen` followed by `tsc --noEmit`. |
| `npm run db:validate` | Validate the Prisma schema using `prisma7.config.ts`. |
| `npm run db:generate` | Generate Prisma Client using `prisma7.config.ts`. |
| `npm run health:check` | Check the local `/api/health` endpoint while the development server is running. |
| `npm test` | Run Vitest unit tests once. |
| `npm run test:watch` | Run Vitest in watch mode during development. |
| `npm run test:e2e` | Run Playwright browser tests; Playwright starts the Next.js dev server on port 3100. |

Automated tests are organized into `tests/unit` (Vitest) and `tests/e2e` (Playwright). See [testing instructions](docs/testing.md). Playwright uses Chromium only to keep the local setup lightweight. Install its browser once with `npm run test:e2e:install`.

## PostgreSQL and Prisma 7

- Schema: `prisma/schema.prisma`.
- The schema contains 57 clinic-domain models across Phases 2A–2D plus the Phase 3A authentication, employee-role, and patient-delegation models. Phase 2E migration SQL adds PostgreSQL-only integrity constraints and deferred triggers for bookings, schedules, billing reconciliation, refunds, radiology modality/workflow, and audit retention.
- CLI configuration: `prisma7.config.ts`, which loads `.env` for Prisma CLI commands.
- Updates 11–13 finalized the initial migration-preview generator, PostgreSQL integrity checks, and synthetic seed workflow. Updates 14–15 added the authentication schema and were followed by the local authentication/bootstrap work. Use `npx prisma migrate status` to inspect the local database before any new migration. A successful `prisma validate` checks the schema definition; it does not create PostgreSQL tables.
- The generated client is written to `generated/prisma` and imported by relative path. From `src/server/db/client.ts`, the current import is `../../../generated/prisma/client`.
- Runtime access uses `PrismaPg` from `@prisma/adapter-pg` and a reusable `PrismaClient` instance.
- `generated/prisma` is generated output and is Git-ignored. Recreate it with `npm run db:generate` after installing dependencies and whenever the schema or generator configuration changes.
- Do not regenerate or replace the existing migration history. For any new schema change, create a reviewed incremental migration. Never use `db push`, `migrate reset`, or another destructive command as a shortcut.

### Current database health foundation

The current source contains:

- `src/server/env.ts` — validates `DATABASE_URL` on the server with Zod 4.
- `src/server/db/client.ts` — creates and reuses the Prisma Client with the PostgreSQL adapter and bounded pool settings.
- `src/server/health/database.ts` — executes `SELECT 1` and returns a boolean health result.
- `src/app/api/health/route.ts` — exposes `GET /api/health`, with HTTP 200 when healthy and HTTP 503 when unavailable; responses are marked `no-store`.

These files are present in the supplied source archive. The archive deliberately does not include the private `.env`, so a live HTTP 200 check must be performed on the developer's machine using its configured database.

## Git and GitHub

- `.git` is a hidden **directory**, not a project source file. It stores the local Git repository metadata, commits, branches, and remote configuration. It is not pushed as a folder to GitHub and is not needed inside a source-update ZIP.
- `.gitignore` is a normal text file and **should be committed**. It tells Git which local/generated files not to track.
- Keep the existing `.git` directory when applying update ZIPs to the current working copy. Do not replace the entire project folder with an archive that omits `.git`.
- Never commit `.env`, `node_modules`, `.next`, `generated/prisma`, or `*.tsbuildinfo`. Keep `.env.example`, `package.json`, and `package-lock.json` tracked.
- Once the repository is connected to GitHub, the normal update cycle is: inspect `git status`, stage only intended project changes, commit with a descriptive message, and push. No manual copying of `.git` is involved.

## Repository map

```text
prisma/
  schema.prisma              # Prisma 7 generator + PostgreSQL datasource + Phase 2A/2B/2C domain models
prisma7.config.ts            # Prisma CLI configuration; loads local .env
src/
  app/
    (public)/                # Public route group and minimal homepage shell
    api/health/              # Database health endpoint
    layout.tsx               # Root layout, Inter, metadata, language/direction
    globals.css              # Tailwind v4 and MERUNO design tokens
  components/
    brand/                   # MERUNO text wordmark
    layout/                  # Public header, footer, and container
    ui/                      # Six local shadcn/Base UI primitives
  lib/                        # Shared isomorphic utilities
  server/                     # Server-only env, Prisma client, health, Better Auth, account linking, and authorization services
tests/
  unit/                       # Vitest unit tests
  e2e/                        # Playwright browser tests
docs/
  architecture.md
  implementation-roadmap.md
  database/                  # Phase 2A–2E domain schema, migrations, and integrity planning
  authentication/              # Phase 3A–3E authentication and authorization notes
  validation.md
  authentication/              # Phase 3A–3E auth and authorization notes
AGENTS.md                     # Project rules and development contract
README.md                     # Setup, current status, and commands
generated/prisma/             # Generated locally; ignored by Git
```


### Phase 2D — Billing and operations

Update 10 adds 12 models: `Invoice`, `InvoiceItem`, `Payment`, `DiscountApproval`, `Refund`, `RefundItem`, `Complaint`, `ComplaintEvent`, `IncidentReport`, `Attachment`, `Notification`, and `AuditLog`. The data model supports multi-item invoices, a single completed full-payment per invoice (enforced with a PostgreSQL partial unique index in Phase 2E), manager approval records for discounts/refunds, item-level refund records, complaint intake and event history, confidential incident records, file metadata, patient/employee notifications, and non-PHI audit metadata.

Billing rules: invoices are tied to a completed encounter; payment is full-only and accepted methods are cash, POS card, or clinic-supported electronic wallet. The model permits payment attempts/status history but Phase 2E must add a partial unique index so only one completed payment can exist per invoice. Discount and refund approvals are represented, while role authorization is enforced in Phase 3. Refund items reference individual invoice items so one unprovided item can be refunded without cancelling other items. Amount reconciliation, completed-service eligibility, cumulative refund ceilings, exactly-one source per billable line, and manager separation-of-duty checks must be enforced transactionally in the application and/or migration SQL.

Attachments store metadata and an opaque `storageKey`, not public URLs or file bytes. Phase 2E must enforce allowed MIME types (PDF/JPEG/PNG), positive file size, exactly one owning record, and purpose/owner consistency. Notification recipient exclusivity (exactly one patient or employee), non-PHI notification content, and audit-log data minimization are also required. Audit logs intentionally do not store before/after clinical values or full payload snapshots.

**Phase 2D status:** schema-only update. Local verification is required after application. No migration or database write is included.


Update 54 completed Phase 7A with the read-only Doctor queue worklist (`GET /api/doctor/queue`); the developer confirmed 593 unit tests, 86 E2E tests, typecheck, lint, and production build passed. Update 55 completed Phase 7B with a protected atomic start-consultation operation; the developer confirmed 613 unit tests across 66 files, 89 E2E tests, typecheck, lint, and production build passed. Update 56 introduces Phase 7C, the Doctor clinical-note draft save/update API; local verification is pending.
