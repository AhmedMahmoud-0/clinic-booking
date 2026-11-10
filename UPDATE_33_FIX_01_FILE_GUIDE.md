# Update 33 Fix 01 — File-by-file Guide

| File | Action | Responsibility |
|---|---|---|
| `src/server/patient-management/validation.ts` | Replace | Add `getPatientPhoneMatchKey` for Egyptian national/international equivalence and `getPatientPhoneLookupValues` for backward-compatible variants; compare contacts using the shared key. |
| `src/server/patient-management/patient-registration.ts` | Replace | Search `PatientContact.normalizedValue` with both local and country-code forms, including during the serializable registration re-check. |
| `tests/unit/patient-registration-validation.test.ts` | Replace | Preserve digit normalization tests and add local/+20 lookup and legacy-contact matching coverage. |
| `docs/patients/phase-5a-patient-registration.md` | Replace | Document Egyptian local/+20 equivalence, legacy lookup compatibility, and unchanged duplicate confidence rules. |
| `docs/implementation-roadmap.md` | Replace | Record Fix 01 and the local-verification-pending state. |
| `README.md` | Replace | Record the phone-comparison fix without claiming Phase 5A is complete. |
| `UPDATE_33_FILE_GUIDE.md` | Replace | Align Update 33 file responsibilities and test count with Fix 01. |
| `APPLY_UPDATE_33_FIX_01.md` | Add | Merge instructions, safeguards, and exact validation commands. |
| `UPDATE_33_FIX_01_FILE_GUIDE.md` | Add | This guide. |
| `UPDATE_33_FIX_01_SUMMARY.txt` | Add | Repair summary. |

## Important rules retained

- A high-confidence duplicate still requires exact full name plus date of birth.
- Shared phone alone remains a review candidate, not an automatic block.
- Shared household phones remain allowed across family members.
- Existing normalized contact values are queried in both forms; they are not bulk-updated.
- No new schema, migration, permission, route, or contact uniqueness rule is introduced.
