# Update 31 Fix 01 — File Guide

| Path | Action | Purpose |
|---|---|---|
| `src/server/clinic-master-data/master-data-validation.ts` | Replace | Adds required `doctorId` to the strict doctor-specialty replacement schema, matching the existing route and service call. |
| `tests/unit/clinic-master-data-validation.test.ts` | Replace | Retains the validation suite, makes the existing valid-set test align with the contract, and adds a regression test for a missing `doctorId`. |
| `docs/master-data/phase-4c-doctor-specialty-input-contract.md` | Add | Documents the exact JSON body contract and security boundary. |
| `APPLY_UPDATE_31_FIX_01.md` | Add | Application instructions and ordered validation commands. |
| `UPDATE_31_FIX_01_FILE_GUIDE.md` | Add | Explains each changed file. |
| `UPDATE_31_FIX_01_SUMMARY.txt` | Add | Short change summary. |

No route or service implementation change is required: the existing route already reads `input.doctorId`, and the service already accepts the target doctor ID separately.
