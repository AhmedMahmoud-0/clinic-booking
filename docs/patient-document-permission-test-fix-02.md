# Patient Document Permission Test — Fix 02

The authorization policy intentionally gives `patient.basic.read` to Reception, Doctor, Nurse, Lab Staff, Radiology Staff, Radiologist, and Cashier. Clinic Manager has operational/oversight permissions and does not receive general patient-profile read access. System Admin has platform-administration permissions and likewise does not receive patient-profile read access.

The test must not assert that every non-Reception role has `patient.basic.read`. Doing so confuses an absent permission with an implicit document-access grant and produces a test failure unrelated to the feature's security invariant.

The corrected test selects only non-Reception roles whose actual `ROLE_PERMISSIONS` entry contains `PATIENT_BASIC_READ`. For those roles, it verifies that neither `PATIENT_DOCUMENT_READ` nor `PATIENT_DOCUMENT_UPLOAD` is present through `hasEmployeePermission`. Separate test cases continue to check that Reception alone receives the two explicit patient-document permissions and that System Admin does not receive them.

This is a test-only correction. It does not broaden any employee role, change the policy matrix, or change runtime access control.
