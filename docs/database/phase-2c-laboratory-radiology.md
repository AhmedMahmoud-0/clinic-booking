# Phase 2C — Laboratory and Radiology Database Design

## Scope

This schema increment adds diagnostic workflows for the single MERUNO clinic. It supports the internal laboratory and radiology limited to digital X-ray and ultrasound. It does not add DICOM/PACS, equipment integration, CT, MRI, mammography, echocardiography, or an external laboratory SaaS.

This is a schema-only update. Do not run migrations, `prisma db push`, reset, or delete database data. Phase 2E will review the complete schema and PostgreSQL-specific constraints before the first migration is created.

## Laboratory models

| Model | Purpose |
|---|---|
| `LabTest` | Catalog of tests, specimen type, preparation, default turnaround, and price |
| `LabTestComponent` | Components/observations expected for a test, including result type and default unit |
| `LabOrder` | A clinician's diagnostic order linked to an encounter |
| `LabOrderItem` | Individual requested tests, preserving price and order-time details |
| `LabSample` | Collection and laboratory receipt/rejection lifecycle |
| `LabSampleItem` | Joins one sample to the requested test item it contains |
| `LabResult` | Result status and author/approver/release timestamps for one order item |
| `LabResultValue` | Typed value snapshots, units, reference-range text, and abnormal flags |
| `LabResultReview` | Laboratory approval/rejection history |
| `LabClinicalReview` | Ordering-clinician review or follow-up acknowledgment after release |
| `LabCriticalCommunication` | Critical-result notification, read-back, acknowledgment, and escalation trace |

### Laboratory workflow

`LabOrder` → `LabOrderItem` → sample collection (`LabSample` / `LabSampleItem`) → receive or reject → processing → result entry (`LabResult` / `LabResultValue`) → laboratory approval (`LabResultReview`) → release → clinician review (`LabClinicalReview`).

Critical values use `LabCriticalCommunication`. The application workflow must require a recipient, notifier, method, read-back where required, acknowledgment, and escalation when acknowledgment is not received. Do not place full clinical results or unnecessary patient details in general notification text.

Reference ranges are stored as snapshots on result values because they may depend on age, sex, laboratory method, and the reference policy in effect at the time of testing. Catalog component defaults are not a substitute for a clinical reference-range engine.

## Radiology models

| Model | Purpose |
|---|---|
| `RadiologyProcedure` | Catalog of supported digital X-ray and ultrasound procedures |
| `RadiologyResource` | Rooms/equipment resources for the supported modalities |
| `RadiologyOrder` | Clinician's request linked to an encounter |
| `RadiologyOrderItem` | Individual procedures in an order, preserving the price snapshot |
| `RadiologyExam` | Scheduling, resource allocation, and examination lifecycle |
| `RadiologyPregnancyScreening` | Recorded screening outcome before X-ray when clinically applicable |
| `RadiologyReport` | Findings, impression, recommendations, approval, and release status |
| `RadiologyReportReview` | Radiologist approval/change-request history |
| `RadiologyClinicalReview` | Ordering-clinician review or follow-up acknowledgment |
| `RadiologyCriticalCommunication` | Critical-report communication, read-back, acknowledgment, and escalation |

### Radiology workflow

`RadiologyOrder` → `RadiologyOrderItem` → schedule `RadiologyExam` and allocate a `RadiologyResource` → identity/preparation checks → pregnancy screening before X-ray when required → perform examination → draft `RadiologyReport` → radiologist review/approval → release → ordering-clinician review.

The `RadiologyModality` enum intentionally contains only `DIGITAL_XRAY` and `ULTRASOUND`. No other modality should be seeded or exposed. The application must block starting an X-ray examination when a required pregnancy screening is absent, positive, or declined until the appropriate clinical process resolves the case. Do not infer pregnancy possibility solely from the stored gender field.

## Design decisions and constraints to finish in Phase 2E

- Prices and numeric result values use `Decimal`, not floating point.
- `LabOrderItem` and `RadiologyOrderItem` preserve price/currency snapshots so catalog price changes do not rewrite historic orders.
- Each lab order item can be assigned to one sample record in this initial design; a sample may contain multiple order items. If actual collection requires aliquots or recollection history, add that explicitly rather than overwriting the original sample.
- Each lab order item has at most one current result record. Corrected/updated results must be versioned or amended with an immutable audit trail before workflow implementation.
- A radiology exam belongs to one order item and may reserve one resource. Resource time conflicts require a PostgreSQL exclusion constraint in the reviewed Phase 2E migration.
- Add CHECK constraints for non-negative prices, positive durations, valid timestamp ordering, and typed result-value consistency.
- Enforce that pregnancy screening applies to X-ray only and is completed before the exam starts in the application workflow; a cross-table condition requires an explicit database-trigger or transactional policy if it must be enforced at the database boundary.
- Role checks (Lab Staff, Radiology Staff, Radiologist, ordering Doctor) are not encoded in these foreign keys. They are enforced by authenticated server-side authorization in Phase 3 and domain workflows later.
- Critical communication status changes and result/report status changes must be written to `AuditLog` when the Phase 2D audit model is added.

## Models added

Phase 2C adds 21 Prisma models: 11 laboratory models and 10 radiology models. Combined with Phase 2A (11) and Phase 2B (13), the design contains 45 domain models.
