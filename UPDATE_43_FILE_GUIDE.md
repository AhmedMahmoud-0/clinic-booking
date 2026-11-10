# MERUNO Update 43 — File-by-file guide

## New server files

| File | Purpose |
|---|---|
| `src/app/api/reception/appointments/[appointmentId]/resolve-guest/route.ts` | Reception permission-guarded guest-to-Patient resolution endpoint with strict same-origin and input handling. |
| `src/server/appointments/guest-appointment-resolution-validation.ts` | Strict contract for one selected Patient and the existing two-element identity-verification input. |
| `src/server/appointments/guest-appointment-resolution-policy.ts` | Pure policy for accepting only unresolved, confirmed public guest appointments. |

## Existing server file replaced

| File | What changed |
|---|---|
| `src/server/appointments/appointment-booking.ts` | Adds a Serializable guest-resolution transaction, active Reception recheck, two-element Patient-record comparison, failed verification/audit, patient-overlap blocking/audit, atomic verified link, guest token revocation, and database-conflict mapping. Existing patient, guest, and Reception booking methods remain in place. |

## Tests added

| File | Coverage |
|---|---|
| `tests/unit/guest-appointment-resolution-validation.test.ts` | Eight strict input tests. |
| `tests/unit/guest-appointment-resolution-policy.test.ts` | Eight appointment-state policy tests. |
| `tests/e2e/guest-appointment-resolution.spec.ts` | Two anonymous-access and forged-override boundary tests. |

## Documentation replaced/added

| File | What changed |
|---|---|
| `README.md` | Marks Update 42 / Phase 6B3A verified and Phase 6B3B / Update 43 current. |
| `docs/implementation-roadmap.md` | Records the guest-resolution workflow and the remaining Phase 6B3C patient-overlap exception. |
| `docs/appointments/phase-6b3b-guest-identity-resolution.md` | Documents endpoint contract, identity rules, transaction behavior, token revocation, overlap handling, and exclusions. |

## Database and dependencies

No schema, migration, seed, generated client, package, or environment changes are included. The existing migration 9 deferred trigger remains the final cross-table identity invariant.
