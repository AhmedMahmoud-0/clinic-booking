# Phase 4D — Laboratory and Radiology Master Data

## Purpose

Update 32 adds permission-protected administration APIs over the diagnostic catalog models that were already introduced in Phase 2C. It does not create a laboratory workflow, radiology ordering/scheduling workflow, diagnostic result-entry workflow, or staff workspace UI.

## Existing data reused

- `LabTest` — test code, display name, specimen, turnaround, fasting requirement, preparation instructions, current EGP price, active state.
- `LabTestComponent` — typed result component definitions and their order.
- `RadiologyProcedure` — procedure code, name, modality, default duration, current EGP price, preparation instructions, active state.
- `RadiologyResource` — physical X-ray/ultrasound room or equipment, modality, location, active state.
- `AuditLog` — employee-attributed create/update events.

The existing synthetic seed includes eight lab tests with selected components, four radiology procedures, and two radiology resources. Update 32 does not change or rerun that seed.

## Permission boundary

Every staff endpoint uses `CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE`. The existing role policy grants this permission only to Clinic Manager and System Admin. Diagnostic staff may use diagnostic operational workspaces in later phases; this catalog administration permission is not granted to them by this update.

## API surface

All routes are under `/api/clinic/diagnostic-master-data` and return no-store JSON responses.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/` | List lab tests and components, radiology procedures, and resources for staff administration |
| POST | `/lab-tests` | Create a laboratory test |
| PATCH | `/lab-tests/:labTestId` | Update editable laboratory test fields or deactivate it |
| POST | `/lab-tests/:labTestId/components` | Add a result component to an active test |
| PATCH | `/lab-test-components/:componentId` | Update component display/order/active fields |
| POST | `/radiology-procedures` | Create an X-ray or ultrasound procedure |
| PATCH | `/radiology-procedures/:procedureId` | Update procedure details/price/duration or deactivate |
| POST | `/radiology-resources` | Create a digital X-ray or ultrasound resource |
| PATCH | `/radiology-resources/:resourceId` | Update resource name/location or active state |

## Safety and data rules

- Radiology modality accepts only `DIGITAL_XRAY` and `ULTRASOUND`; CT, MRI, mammography, echo, PACS, and DICOM remain out of scope.
- Catalog codes are uppercase identifiers. Existing codes are immutable after creation to avoid rewriting historical references.
- Lab component code and value type are immutable after creation. Existing `LabResultValue` rows keep their code/name/unit/value-type snapshots; components can be soft-deactivated or re-ordered.
- Procedure/resource modalities are immutable after creation. The existing database integrity layer remains responsible for procedure/resource modality compatibility when exams are assigned.
- Lab and radiology prices are stored as EGP with two decimal places. Existing `LabOrderItem.priceSnapshot` and `RadiologyOrderItem.priceSnapshot` remain unchanged when current catalog prices are updated.
- A radiology resource cannot be deactivated while it has a scheduled or in-progress exam. Reassign or complete those exams first.
- No diagnostic order, sample, result, report, or patient data is returned by the master-data DTO.
- Every create/update and its audit record execute in the same transaction. An audit failure rolls back the catalog mutation.
- Deactivation is soft; historical orders and results are not deleted.

## Validation and operations

Inputs are strict Zod objects. Prices must be positive EGP values with at most two decimal places. Durations are 5–240 minutes; laboratory turnaround is 1–20,160 minutes. Optional descriptions, specimen labels, units, and preparation instructions can be explicitly cleared with `null` where applicable.

## Database and deployment impact

No Prisma model or enum changes, migration, seed changes, client generation, dependency change, or environment-variable change is included. The current database migration history remains untouched.

## Deferred work

- Diagnostic staff workspaces and lab/radiology operational workflows belong to Phase 8.
- Patient identity/sample handling, processing, result approval, X-ray pregnancy screening, radiologist approval, and release flows belong to Phase 8.
- Public diagnostic catalog exposure belongs to the public website work in Phase 10, after an explicit public-content policy is established.
- Clinic Manager/System Admin screens belong to Phase 11.
