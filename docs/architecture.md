# MERUNO Architecture

This document describes the approved technical architecture for MERUNO. It records decisions and boundaries; it does not claim that planned features exist. See [Implementation status](#implementation-status) for what is actually built.

## Implementation status

- Phase 0 (planning and technical direction) is complete.
- Phase 1 (project foundation) is complete and locally verified. The developer confirmed: 4/4 Vitest tests, 3/3 Playwright tests, ESLint, TypeScript, Prisma validation, and production build all passed. The database health smoke test also returned HTTP 200, `database: ok`, and `Cache-Control: no-store`.
- Phase 2A (11 models) and Phase 2B (13 models) are implemented in `prisma/schema.prisma`. The developer confirmed Update 08 validation, Prisma Client generation, TypeScript, ESLint, unit tests (4/4), E2E tests (3/3), and production build passed.
- Update 09 adds the Phase 2C laboratory/radiology schema (21 additional models); local verification is pending.
- Phase 2D (billing/operations), Phase 2E (reviewed migrations and synthetic seed), and Phases 3–12 remain pending. No database migration has been applied and no seed data has been inserted.

The application still has only a minimal public homepage shell and technical foundations. It does **not** yet have patient registration, authentication, appointment booking, encounters, clinical workflows, laboratory/radiology workflows, billing, or staff workspaces. A valid Prisma schema does not mean database tables have been created.

See [the complete implementation roadmap](implementation-roadmap.md) for all 13 phases (0–12), phase scope, guardrails, and current step status. Design boards are references, not proof of implementation.
## Architectural style: modular monolith

MERUNO is a single Next.js full-stack application. One deployable unit serves the public website, the patient portal, and the staff workspaces.

- Modules are organized by business capability (for example appointments, encounters, laboratory, radiology, billing) once those capabilities exist.
- Each module owns its own server-side data access and validation for its domain.
- Modules may call shared server-only infrastructure, but must not reach into each other's internals.
- Shared UI primitives and utilities live in shared locations instead of being duplicated per module.

This is deliberately not microservices, not a separate backend API, and not a monorepo of applications. Those add operational cost without a demonstrated need at this project's size.

## Rendering: Next.js App Router

The application uses the App Router under `src/app` with React Server Components.

- Server Components are the default. Data fetching and sensitive logic stay on the server.
- Client Components are used only where browser interaction requires them: local UI state, event handlers, focus management, and similar behavior.
- Client Components must never import server-only modules.
- Route files use the generated Next.js 16 route types (`PageProps<'/route'>`, `LayoutProps<'/'>`, `RouteContext<'/route'>`) rather than hand-written prop types.
- `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are async in this Next.js version.
- Loading, error, empty, and not-found states are provided per route segment and kept consistent across the application.

Server state is not copied into client state without a reason. A Client Component that needs server data receives it as props from a Server Component or through a Server Action response.

## Mutations: Server Actions and Route Handlers

- Server Actions are the default mechanism for mutations initiated by the application's own UI, such as booking, check-in, or saving a draft.
- Route Handlers are used for dedicated HTTP endpoints that cannot be Server Actions: file downloads, PDF generation, inbound webhooks, and health checks.
- Every Server Action and Route Handler independently authenticates and authorizes the request. Proxy redirects and hidden UI are not authorization boundaries.
- Validation runs on the server with a shared schema before any database write.
- Mutations that change several related records run in a transaction.
- Responses return stable, user-safe messages rather than raw database errors.

## Data access

### Server-only Prisma

- Prisma access lives in server-only modules under `src/server`. Client Components never import them.
- The application uses one `PrismaClient` instance built with `@prisma/adapter-pg`. The instance is cached on `globalThis` in development so hot reloads do not create new connection pools.
- Queries are not written inline in presentation components, and pages do not call Prisma directly.
- Queries select only the fields they need and avoid N+1 patterns.
- The generated client is written to `generated/prisma` and imported by relative path; `@/*` covers `src/*` only.

### Future authenticated data access layer (Phase 3)

Phase 3 introduces an authenticated data access layer. It is the only place where authenticated application reads and writes are composed.

Every data access function is expected to:

1. Resolve the authenticated actor from the session on the server.
2. Check the permission required for the operation, following least privilege.
3. Check record-level scope: ownership, staff assignment, ordering doctor, guardian relationship, or delegation as applicable to the domain.
4. Check record state, so that unapproved results, cancelled appointments, or amended records are handled correctly.
5. Return a minimal, safe DTO instead of a raw Prisma record.

Illustrative shape only — this code does not exist yet:

```ts
// Planned Phase 3 pattern, not present in the repository.
export async function getPatientAppointmentSummary(
  appointmentId: string,
): Promise<AppointmentSummary | null> {
  const actor = await requireActor();
  // Authorize actor against the appointment, then map to a minimal DTO.
}
```

Rules that apply once the layer exists:

- A DTO exposes only the fields the caller needs. Internal identifiers, audit columns, and unrelated clinical detail stay server-side.
- Client-supplied roles, user IDs, patient IDs, doctor IDs, and permission flags are never trusted; the server re-derives them from the session and database.
- Administrative emergency access is temporary, justified, and audited.

## Language and layout

- English-only interface.
- LTR-only layout.
- Do not add language switching, translation dictionaries, localized routes, or right-to-left styles. This decision supersedes earlier bilingual requirements.

## Proposed route groups

The intended structure once the relevant phases land:

```text
src/app/
  (public)/     Public website: home, specialties, doctors, contact, booking entry
  (auth)/       Sign in, registration, password reset
  (patient)/    Patient portal: appointments, results, prescriptions, instructions
  (staff)/      Staff workspaces: reception, doctor, nurse, laboratory, radiology, cashier, admin
  api/          Route Handlers for downloads, PDFs, and health checks
```

Phase 1 builds only the public application shell and the design foundation. It does not create empty protected route groups.

Why the other groups are deferred:

- `(auth)`, `(patient)`, and `(staff)` require sessions, roles, permissions, and layout-level authorization, which arrive in Phase 3. Creating them earlier would produce unprotected placeholders that imply functionality that does not exist.
- Complete public pages and the patient portal belong to Phase 10. Phase 1 establishes the shell, shared primitives, and technical foundations only.

A group is created when its phase starts, together with the authorization it needs.

## Phase boundaries

| Phase | Scope |
| --- | --- |
| Phase 1 — Foundation | Documentation, environment template, design foundation, shared UI primitives, public application shell, server-only Prisma foundation, Zod validation foundation, and test tooling. No domain features. |
| Phase 2 — Domain schema | Domain models, relations, migrations, and synthetic demo seed data. |
| Phase 3 — Authentication and authorization | Better Auth integration, authentication, the role and permission model, protected workspaces, and the authenticated data access layer. |
| Phase 10 — Public website and patient portal | Complete public website content and the patient-facing portal. |

Rules:

- Do not implement later-phase features early.
- Do not skip a phase boundary because a later feature seems convenient.
- Schema changes, migrations, and authentication changes require explicit approval.

## Authentication and authorization (Phase 3)

- Role-based access control with least privilege. Expected roles: Admin, Clinic Manager, Receptionist, Doctor, Nurse, Laboratory Staff, Radiology Staff, Radiologist, Cashier, Patient.
- Authorization is enforced on the server for every protected operation.
- Better Auth is the provisional Phase 3 selection. It is not installed or configured in Phase 1, and the choice is not final until Phase 3 begins.
- `proxy.ts` (not `middleware.ts`) may perform coarse redirects for unauthenticated visitors. It is never the authorization boundary.
- Deactivated employees must not retain access.

## Validation: Zod 4

- Zod 4 is the single validation library, installed once in Phase 1 and reused afterwards.
- Schemas live in shared modules so the same rules can be used by Server Actions, Route Handlers, and form components.
- The server validates every external input: forms, URL parameters, search parameters, and request bodies.
- Client-side validation is a convenience for feedback, never the authoritative check.
- `DATABASE_URL` is validated on the server before Prisma Client creation by `src/server/env.ts` using Zod 4. Shared schemas for external request/form inputs are a remaining Phase 1 Step 8 task.
- Validation errors are mapped to stable, user-safe messages before they reach the client.

## UI system

- Tailwind CSS 4 runs through the `@tailwindcss/turbopack` loader configured in `next.config.ts`. There is no PostCSS configuration, and it must not be replaced with one.
- shadcn/ui with Base UI is the selected component base. Components are copied into the repository and owned locally rather than consumed as a black-box dependency.
- Inter Variable is served from a self-hosted Fontsource package, not a third-party font CDN.
- Approved MERUNO palette:

| Token | Value |
| --- | --- |
| Primary | `#176B67` |
| Secondary | `#8CBDB4` |
| Background | `#F5F8F7` |
| Surface | `#FFFFFF` |
| Text | `#24343B` |
| Border | `#E8EEED` |

- Shared primitives are business-agnostic. Domain-specific composition happens in the feature that needs it.
- Accessibility, visible focus states, and keyboard operation are part of the primitive's definition of done.

## Testing

- Vitest is installed and runs the unit suite under `tests/unit/`. The developer confirmed 4 tests passed.
- Playwright is installed and runs Chromium browser tests under `tests/e2e/`. The developer confirmed 3 E2E tests passed.
- The developer also confirmed `npm run lint`, `npm run typecheck`, `npm run db:validate`, and `npm run build` passed for the current Update 06 project state.
- Component tests through jsdom and Testing Library are not part of the current setup; reconsider them only when a component genuinely needs them.
- Update 07 changes the Prisma schema. Run `npm run db:validate`, then `npm run db:generate`, then `npm run typecheck` after applying it. Re-run the full test/build suite after the broader schema work or before a release.
- These initial tests cover technical foundations and the public shell only; they do not yet prove appointment, clinical, lab, radiology, billing, or authorization workflows.

## Deliberate non-goals

The following are excluded unless the project owner approves a scope change:

- Microservices or a separate backend application.
- A global client state library. Server Components, URL state, and local React state cover the current needs.
- Premature infrastructure: queues, caches, search clusters, or event buses.
- Multiple clinic branches, inpatient care, emergency department, surgery, pharmacy inventory, payroll, insurance claims, online payment gateways, installments, telemedicine, AI diagnosis, messaging integrations, PACS/DICOM, and hardware integrations.
- Bilingual, RTL, and i18n support.

## Related documents

- [README](../README.md) — setup, scripts, and current status.
- [AGENTS.md](../AGENTS.md) — development rules, security rules, and the project contract.


## Phase 2D — Billing and operations data model

The billing and operational modules add Invoice/InvoiceItem/Payment, DiscountApproval, Refund/RefundItem, Complaint/ComplaintEvent, IncidentReport, Attachment, Notification, and AuditLog. Invoices are encounter-linked and preserve item-level service snapshots. Payment methods are restricted to cash, POS card, and clinic-supported electronic wallets. There is no insurance, online gateway, installment, or partial-payment workflow. Refund items reference individual invoice items.

Complaint and incident records retain their own lifecycle/history. Incident access must be confidential and role-restricted in Phase 3. Attachments retain metadata plus opaque storage keys; files are stored separately, and only PDF/JPEG/PNG are permitted by the application. Notifications target one patient or employee and must not include clinical details in result-ready messages. AuditLog deliberately records action/entity/actor/time/reason metadata only; do not store PHI, secrets, or clinical before/after snapshots.

The schema does not implement transactional invariants. Phase 2E must add PostgreSQL constraints/indexes and application-level transaction rules for full payment, one completed payment per invoice, invoice total reconciliation, service-completion eligibility, item-level refund ceilings, attachment ownership and MIME/size rules, and exactly-one notification recipient. Phase 3 implements server-side authorization.
