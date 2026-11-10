# Update 36 Fix 02 — File Guide

| File | Action | Purpose |
| --- | --- | --- |
| `tests/unit/patient-document-permission.test.ts` | Replace | Corrects the test's role selection so it considers only non-Reception roles that really have `patient.basic.read`, then confirms this basic access does not imply document read or upload. |
| `README.md` | Replace | Updates the Phase 5D status and records the remaining validation state. |
| `docs/implementation-roadmap.md` | Replace | Records Fix 02 and keeps Phase 5D open pending the developer's complete five-command validation. |
| `docs/patient-document-permission-test-fix-02.md` | Add | Explains the test assumption, why Clinic Manager is excluded, and the security invariant retained. |

No production source file is changed by Fix 02.
