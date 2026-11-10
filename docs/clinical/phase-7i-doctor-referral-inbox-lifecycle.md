# Phase 7I — Doctor Referral Inbox and Lifecycle (Update 62)

## Scope

This is a server-side API/data-layer increment. It reuses the original Phase 2B `Referral` model and the enum values already present in the database. No Prisma schema change, migration, seed change, dependency, package script, or UI work is included.

## Endpoints

| Method | Endpoint | Permission | Behavior |
| --- | --- | --- | --- |
| `GET` | `/api/doctor/referrals/inbox` | `clinical.assigned.read` | Return open internal referrals directly assigned to the current Doctor or routed to one of their active specialties. |
| `POST` | `/api/doctor/referrals/:referralId` | `clinical.order.create` | Apply exactly one `ACCEPT`, `COMPLETE`, or `CANCEL` lifecycle action. |

The inbox rejects query parameters. The lifecycle endpoint requires same-origin JSON and a strict body containing only `action`.

## Lifecycle supported by the existing database enum

The original `ReferralStatus` enum contains only `PENDING`, `ACCEPTED`, `COMPLETED`, and `CANCELLED`. It does not contain `REJECTED`; this increment deliberately does not add a new enum value or misrepresent rejection as cancellation.

Permitted transitions are:

- The exact referred-to Doctor, or an active Doctor who belongs to the specialty for a specialty-only referral, may move `PENDING` → `ACCEPTED`.
- An eligible Doctor for the same referral target may move `ACCEPTED` → `COMPLETED`. The service sets `completedAt` using the server clock.
- Only the originating Doctor employee may move `PENDING` or `ACCEPTED` → `CANCELLED`. Cancellation does not set `completedAt`.
- No action is permitted after `COMPLETED` or `CANCELLED`.
- External referrals are not listed in the internal Doctor inbox and cannot be accepted/completed by an internal Doctor. Their originating Doctor may cancel them while they are still open.

A specialty-only referral remains a specialty-team work item: any active Doctor currently assigned to that active specialty can accept or complete it. The existing schema has no `acceptedByEmployeeId` field, so this update does not claim exclusive ownership by the first Doctor who accepts it. Adding individual acceptance ownership would require a separately reviewed schema/migration change.

## Authorization and transaction boundaries

- Resolve the actor from the authenticated employee session. Do not accept employee, Doctor, patient, author, status, or timestamp fields from the client.
- Recheck active Employee status, active `DOCTOR` role assignment, and linked DoctorProfile inside the data service.
- Inbox results are restricted to the authenticated Doctor ID or active specialty membership. Another Doctor's direct referral is not visible merely because both doctors share a specialty.
- The inbox includes only `INTERNAL` referrals in `PENDING` or `ACCEPTED` state, all matching open entries, ordered newest first. It returns minimal patient identity (name, MRN, active flag), referral details, and source Doctor/Encounter reference; it does not return DOB, contacts, full clinical chart, diagnoses, or notes.
- Lifecycle writes lock the Referral row with `FOR UPDATE`, re-resolve the active actor, check the exact target/author and current state, update status, and write a PII-minimal audit event in one Serializable transaction.
- Concurrent state changes fail safely with a conflict response. Every successful lifecycle transition is separately audited.

## Deliberate exclusions

- No `REJECTED` status; no new enum or migration.
- No reassignment, editing, withdrawal reason, accepted-by ownership field, external-provider receipt confirmation, attachments, notifications, patient appointment creation, cross-Doctor Encounter transfer, or clinical-chart access beyond the existing referral inbox DTO.
- No Doctor UI or patient/public portal UI.
- No change to the existing Encounter-scoped referral creation/history routes from Update 61.

This remains a synthetic-data portfolio/demo application, not production clinical software.
