# Update 61 — File-by-file guide

## New server modules

| File | Purpose | Main exports / behavior |
| --- | --- | --- |
| `src/server/appointments/doctor-referral.ts` | Doctor-only Encounter referral history and atomic internal/external referral creation. | `getDoctorEncounterReferrals()`, `createDoctorReferral()`, `DoctorReferralError`. |
| `src/server/appointments/doctor-referral-policy.ts` | Pure policy checks for Doctor/Encounter ownership and internal/external target consistency, target availability, and Doctor-specialty association. | `decideDoctorReferralEncounterAccess()`, `decideDoctorReferralTarget()`. |
| `src/server/appointments/doctor-referral-validation.ts` | Strict Zod validation for Encounter ID and internal/external referral request bodies. | `doctorReferralEncounterIdSchema`, `doctorReferralRequestSchema`. |

## New Route Handler

| File | Methods | Purpose |
| --- | --- | --- |
| `src/app/api/doctor/encounters/[encounterId]/referrals/route.ts` | `GET`, `POST` | Read referrals on the authenticated Doctor's own active Encounter and create a new `PENDING` referral. |

## Tests

| File | Coverage |
| --- | --- |
| `tests/unit/doctor-referral-policy.test.ts` | 20 policy tests for active Doctor/Encounter access, internal specialty/Doctor targets, external-facility targets, target availability, and Doctor-specialty matching. |
| `tests/unit/doctor-referral-validation.test.ts` | 16 validation tests for IDs, internal/external shape, reason/instructions bounds, and forged fields. |
| `tests/e2e/doctor-referrals.spec.ts` | 3 unauthenticated authorization-boundary tests for referral history, creation, and forged identity/lifecycle fields. |

## Documentation

- `docs/clinical/phase-7h-doctor-referrals.md` documents endpoint contracts, permissions, target validation, audit behavior, and exclusions.
- `docs/implementation-roadmap.md` marks Phase 7G complete following migration 12 confirmation and records Phase 7H as the current increment.
- `README.md` updates the current project status and the expected next workflows.
- `UPDATE_61_SUMMARY.txt` lists the update scope and expected test totals.

## Existing files to replace

- `README.md`
- `docs/implementation-roadmap.md`

## Schema and dependencies

- Reuses `Referral`, `ReferralType`, `ReferralStatus`, `Specialty`, `DoctorProfile`, `Employee`, `Encounter`, and `AuditLog`.
- The original migration already contains `Referral_target_matches_type_chk`; this update adds no migration and no Prisma schema change.
- No seed change, dependency change, package script, or environment change is included.
