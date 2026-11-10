# Phase 7H — Doctor Referrals (Update 61)

## Scope

This is an API/data-layer increment. It reuses the existing `Referral`, `ReferralType`, and `ReferralStatus` schema created in Phase 2B. No Prisma schema edit, migration, seed change, package change, or UI work is included.

## Endpoints

| Method | Endpoint | Permission | Behavior |
| --- | --- | --- | --- |
| `GET` | `/api/doctor/encounters/:encounterId/referrals` | `clinical.assigned.read` | Read referrals linked to the authenticated Doctor's own active Encounter. |
| `POST` | `/api/doctor/encounters/:encounterId/referrals` | `clinical.order.create` | Create a new `PENDING` internal or external referral for the authenticated Doctor's own active Encounter. |

Both endpoints reject unsupported query parameters. POST additionally requires same-origin protection and a JSON request body.

## Authorization and transaction boundaries

- Resolve the actor from the authenticated employee session; do not accept a client-supplied employee ID, doctor ID, patient ID, Encounter ID in the body, author, status, or timestamps.
- Recheck that the employee is active, has an active `DOCTOR` role assignment, and has a linked `DoctorProfile`.
- Conceal Encounters assigned to another Doctor as not found.
- Require the Encounter to remain `IN_PROGRESS`, have no completion timestamp, and have a consistent appointment-origin (`IN_CONSULTATION`) or walk-in-origin (`IN_SERVICE`) relationship.
- GET uses Repeatable Read. POST locks the Encounter row and performs target validation, Referral creation, and audit recording in one Serializable transaction.
- New referrals always receive server-selected status `PENDING`. Repeated referrals are allowed as separate intentional records; no idempotency token is persisted in this increment.

## Referral target rules

**Internal referral**
- Requires an active Specialty ID, an active Doctor ID, or both.
- A Doctor target must link to an active Employee with an active `DOCTOR` role assignment.
- When both Doctor and Specialty are supplied, the Doctor must be assigned to that Specialty.
- External facility/contact fields are rejected.

**External referral**
- Requires a non-empty external facility name.
- Optional external contact is bounded to 180 characters.
- Internal Doctor and Specialty IDs are rejected.

The request requires a non-empty reason (maximum 1,000 characters). Optional instructions are limited to 4,000 characters. No client-supplied lifecycle fields are accepted.

These application checks align with the existing `Referral_target_matches_type_chk` database constraint from the original migration. No new migration is necessary.

## Returned data and audit

The response returns the referral's type/status, internal Specialty and Doctor display information or external facility/contact, reason, instructions, and lifecycle timestamps. It does not return patient records, the author employee ID, or unrelated Encounter details.

Creation writes `DOCTOR_REFERRAL_CREATED` to `AuditLog` with the authenticated employee actor, Referral/Encounter identifiers, and target kind. Referral reason and external contact/facility details are not copied into the audit event.

## Not included

- Accepting, rejecting, completing, cancelling, editing, or reassigning referrals.
- A referral inbox or workflows for the referred-to Doctor.
- Referral documents, attachments, external provider directory, appointment booking, or notifications.
- Follow-up scheduling, clinical-note approval/correction, vital signs, Nurse workflows, Doctor UI, or public/patient portal UI.

This remains a synthetic-data portfolio/demo system, not production clinical software.
