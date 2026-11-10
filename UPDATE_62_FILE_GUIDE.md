# Update 62 — File-by-file guide

## New server modules

| File | Purpose |
| --- | --- |
| `src/server/appointments/doctor-referral-lifecycle-policy.ts` | Pure visibility and lifecycle-transition rules for the Doctor inbox. No database access. |
| `src/server/appointments/doctor-referral-lifecycle-validation.ts` | Strict Zod schemas for referral ID and exactly one lifecycle action. |
| `src/server/appointments/doctor-referral-lifecycle.ts` | Server-only Doctor inbox read and row-locked, Serializable referral lifecycle writes with atomic audit events. |

## New Route Handlers

| Endpoint | Behavior |
| --- | --- |
| `GET /api/doctor/referrals/inbox` | Current Doctor's open internal referrals: direct assignments or specialty-only referrals for an active assigned specialty. |
| `POST /api/doctor/referrals/:referralId` | Accept, complete, or cancel a referral when the actor and current status meet the policy. |

## Tests

- `tests/unit/doctor-referral-lifecycle-policy.test.ts`: inbox privacy boundaries, active Doctor checks, exact recipient checks, specialty routing, and valid/invalid transitions.
- `tests/unit/doctor-referral-lifecycle-validation.test.ts`: action allowlist, rejection of forged status/actor fields, and referral ID bounds.
- `tests/e2e/doctor-referral-lifecycle.spec.ts`: authentication gates and forged lifecycle/identity fields.

## Documentation

- `docs/clinical/phase-7i-doctor-referral-inbox-lifecycle.md`: full workflow contract and limitations.
- `README.md` and `docs/implementation-roadmap.md`: status after verified Update 61 and planned Update 62.

## Intentionally unchanged

No Prisma schema, migrations, seeds, translation files, package manifests, auth configuration, permission matrix, or UI components are changed.
