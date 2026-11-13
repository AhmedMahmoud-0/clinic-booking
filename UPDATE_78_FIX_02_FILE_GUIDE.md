# MERUNO Update 78 — Fix 02 file guide

| Path | Change |
|---|---|
| `tests/e2e/clinic-manager-operations.spec.ts` | Makes Reception complaint-intake browser coverage match the actual role matrix and the E2E actor's authentication state. |
| `tests/unit/clinic-manager-operations-policy.test.ts` | Explicitly verifies that Doctor, Nurse, Lab Staff, Radiology Staff, Radiologist, Cashier, and System Admin do not have complaint-intake permission. |

No application runtime files are changed. No schema, migration, dependency, or environment changes are included.
