# Update 33 — File-by-file Guide

| File | Action | Responsibility |
|---|---|---|
| `src/server/patient-management/validation.ts` | Add | Strict patient intake and duplicate-check schemas, Cairo-local date validation, Arabic/English digit normalization, Egyptian local/+20 phone equivalence, backward-compatible phone lookup variants, and pure duplicate matching. |
| `src/server/patient-management/patient-registration.ts` | Add | Minimal demographic duplicate search using canonical and legacy phone lookup forms, serializable duplicate re-check, cryptographically generated MRN, patient/contact creation, two-element identity verification, and atomic audit events. |
| `src/server/patient-management/errors.ts` | Add | Safe typed patient registration errors, including duplicate candidate details. |
| `src/server/patient-management/http.ts` | Add | Same-origin JSON parsing, no-store responses, and safe error mapping. |
| `src/app/api/reception/patients/route.ts` | Add | Reception-protected patient creation endpoint. |
| `src/app/api/reception/patients/duplicate-check/route.ts` | Add | Reception-protected duplicate candidate check endpoint. |
| `tests/unit/patient-registration-validation.test.ts` | Add | Validation, normalized identifiers, local/+20 phone equivalence, confidence classification, and duplicate matching coverage (28 tests after Fix 01). |
| `tests/e2e/patient-registration.spec.ts` | Add | Confirms anonymous requests cannot search duplicates or create patients (2 tests). |
| `docs/patients/phase-5a-patient-registration.md` | Add | API contracts, identity and duplicate rules, privacy boundary, and deferred work. |
| `docs/implementation-roadmap.md` | Replace | Marks Phase 4 complete and Phase 5A as the current increment. |
| `README.md` | Replace | Updates project implementation status. |
| `APPLY_UPDATE_33.md` | Add | Merge instructions and exact validation sequence. |
| `UPDATE_33_FILE_GUIDE.md` | Add | This file. |
| `UPDATE_33_SUMMARY.txt` | Add | Package summary. |

## Important behavior

- The registration API uses existing `patient.basic.manage`; only Reception currently has this permission.
- A high-confidence duplicate requires both exact full name (including the middle name when present) and date of birth, including matches against inactive patient records. Shared phone numbers alone, or date of birth plus shared phone with a different name, are only review candidates and do not auto-block a different family member.
- A National ID/passport check stores only the element type and result. Raw document values are not accepted or stored.
- Patient contacts are not globally unique and are not marked verified by this intake workflow.
- No authentication identity or `PatientAccount` link is created.
