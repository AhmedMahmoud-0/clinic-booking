# Update 35 Fix 01 — File-by-file guide

| File | Change | Purpose |
| --- | --- | --- |
| `src/server/patient-management/patient-contact-consent-validation.ts` | Replace | Adds a final command-schema transform that lowercases only EMAIL contact values after the existing trim/validation. PHONE values and every other action are returned unchanged. |
| `tests/unit/patient-contact-consent-validation.test.ts` | Replace | Checks the parsed discriminated-union result with `toMatchObject`, avoiding an unsafe direct `.value` access on non-ADD_CONTACT variants while still asserting email canonicalization. |
| `docs/patients/phase-5c-patient-contacts-and-consents.md` | Replace | Records the email normalization behavior and Fix 01 details. |
| `docs/implementation-roadmap.md` | Replace | Records the six-migration state and Update 35 Fix 01 pending local re-verification. |
| `README.md` | Replace | Keeps the project status aligned with the current fix and remaining verification. |

## Technical details

The schema remains a discriminated union of all contact-profile commands. Its final `.transform()` checks for the exact branch `{ action: "ADD_CONTACT", type: "EMAIL" }` and returns a copy with a lowercase `value`. For PHONE and non-contact commands, it returns the parsed command unchanged.

The unit test now asserts the expected action, type and normalized value together. This avoids accessing a property that does not exist on other command variants and therefore removes TS2339 without weakening the runtime assertion.

No route, database model, migration, dependency, authorization rule, or API contract changes.
