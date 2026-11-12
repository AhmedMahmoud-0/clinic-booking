# Phase 8F — External laboratory and diagnostic intake

## Scope

This increment adds two separate external-laboratory pathways.

1. **Reception external intake:** capture a paper/electronic request from an outside provider and create a laboratory order without creating a clinic Encounter. Reception can use an existing patient only after the Phase 5B two-element identity matcher succeeds. Otherwise Reception may create a minimal `DIAGNOSTIC_ONLY` patient record with a generated `DX-` MRN. The intake records provider/facility metadata and the linked lab order snapshots current active test pricing/currency.
2. **Doctor referral:** an assigned Doctor can refer an active Encounter to an external facility. A patient or verified legal guardian must grant the specific `EXTERNAL_DIAGNOSTIC_DATA_SHARING` consent. The database trigger verifies the consent belongs to the same patient as the Encounter and is granted.

## Lifecycle and controls

- Referral status: `REFERRED` → `RESULT_RECEIVED` → `REVIEWED`; an uncompleted referral may be `CANCELLED` with a reason.
- Lab Staff record a text result summary received from the outside provider. This API does not upload a file or claim authenticity of a scanned external report.
- Only the Doctor assigned to the Encounter reviews that referral and records review notes.
- External-intake lab orders enter the existing Lab Staff collection/processing/result workflow. The Lab workflow now resolves patient identity from either the internal Encounter or external intake and records sample identity verification using the existing matcher.
- For critical values on an external-intake order, Lab Staff document the outside-provider read-back with resolution notes; the ordering-Doctor notification path is not used because the intake has no clinic Encounter/ordering Doctor.
- Diagnostic-only patient records cannot be linked to appointments, queue entries, Encounters, patient accounts, or family relationships. They can be converted to `FULL` only by Reception after another successful two-element identity verification; the conversion is audited and added to `PatientRecordTypeHistory`.

## Data and privacy boundaries

- No clinic Encounter, patient account, family relationship, or longitudinal visit history is created by external intake.
- Submitted identity values are not stored in IdentityVerification, audit metadata, or notes; only identifier types and verification result are retained.
- Only active catalog tests are selectable. The lab order receives the price and currency snapshots from the server-side catalog.
- All external intake/referral mutations are same-origin protected, permission guarded, transaction-scoped, and audited.
- Use synthetic demo data only. The system does not verify the clinical authenticity of an external provider or result.
