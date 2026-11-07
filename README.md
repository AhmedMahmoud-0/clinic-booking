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
| Phase 4D — Laboratory and radiology catalog/resource administration | Current update — Update 32; protected diagnostic catalog APIs are prepared over existing models; local verification pending; no schema migration. |
| Phases 5–12 | Patient/appointment/clinical/billing workflows, complete public website/portal, management/admin workspaces, and final integrated release testing remain planned. |

The project has completed the technical foundation, domain database design, authentication core, Phases 3E–3F authorization foundation, and all of Phase 3G. Update 27 implements the server-side guardian/adult patient-delegation lifecycle in Phase 3G-C and was locally verified by the developer (86 unit tests, 22 E2E tests, typecheck, lint, and production build). Update 28 and Fix 01 completed Phase 4A; the developer confirmed three applied migrations and all five local validation checks passed (89 unit tests and 22 E2E tests). Update 29 completed Phase 4B1; the developer confirmed four applied migrations and all five local checks passed (98 unit tests and 22 E2E tests). Update 30 completed Phase 4B2 after the developer confirmed five applied migrations and passing local checks (107 unit, 22 E2E). Update 31 and Fix 01 complete Phase 4C; the developer confirmed 131 unit tests, 24 E2E tests, typecheck, lint, and production build passed. Update 32 adds permission-protected diagnostic catalog administration over existing laboratory and radiology models; it does not add a migration or alter the synthetic seed and awaits local verification. Public registration still creates no clinic patient or employee records, and invitation acceptance links only an existing active Employee after the invited email is verified. It does not create an employee record or assign roles. It is not yet a complete clinic application: domain workflows, actual workspace pages, the public website, patient portal, and role-specific operations remain to be implemented in their planned phases. The authorization helpers are foundations, not proof that every future data operation is already protected.

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
- Appointment conflicts and overbooking must be prevented, including concurrent booking attempts. Confirmed appointments must not be displaced by walk-ins.
- Self-service cancellation/rescheduling is allowed at least 24 hours before the appointment; later changes go through reception.
- Encounters are drafted and approved by doctors. Approved records are never silently overwritten or deleted; corrections preserve history, reason, actor, and timestamp.
- Lab and radiology results require the defined review/approval workflow before release. Critical lab results require acknowledgment and escalation.
- Billing supports cash, POS card, and clinic-supported electronic wallets. Full payment only after service; no installments or partial payments. Discounts and refunds require manager approval. Preserve original invoices and record refunds.
- Demo information must remain synthetic.

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
