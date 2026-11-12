# Update 69 — File guide

Update 69 implements Phase 8F–8H: external laboratory intake/referrals, diagnostic-only patient handling, radiology scheduling, patient identity and preparation checks, and X-ray pregnancy screening/review.

## Prisma and migration

- `prisma/schema.prisma` — replaces the schema with the expanded Update 69 model and relation definitions. New structures include patient record type/history, external lab intake/referral, and exam-preparation/review relationships. Existing LabOrder now supports exactly one origin: internal Encounter or external intake.
- `prisma/migrations/20261111010000_external_lab_intake_and_radiology_preparation/migration.sql` — Migration 15. Adds enum values, tables, columns, foreign keys, constraints, triggers, indexes, and PostgreSQL resource-overlap protection.

## External laboratory server modules

- `src/server/laboratory/external-lab-policy.ts` — referral lifecycle and diagnostic-record conversion decisions.
- `src/server/laboratory/external-lab-validation.ts` — strict validation for new/existing-patient intake, referral consent, external result summary, Doctor review, cancellation, and record conversion.
- `src/server/laboratory/external-lab.ts` — transactional intake/referral/result/review/cancellation/conversion operations, identity checks, role/assignment enforcement, and audit records.
- `src/server/laboratory/lab-workflow.ts` — updated Lab worklist, specimen collection/identity verification, processing, and result drafting to resolve patients from either an Encounter or external intake.
- `src/server/laboratory/lab-workflow-policy.ts` and `lab-workflow-validation.ts` — updated policy/validation shared by internal and external orders.
- `src/server/laboratory/lab-result-review.ts`, `lab-result-review-policy.ts`, and `lab-result-review-validation.ts` — updated result worklists/release and critical-result acknowledgement to support external-intake results and documented outside-provider read-back. Existing Update 68 behavior remains in the package.

## Radiology server modules

- `src/server/radiology/radiology-scheduling-validation.ts` — strict time/resource, identity, preparation, pregnancy-screening, and Radiologist-review input schemas.
- `src/server/radiology/radiology-workflow-policy.ts` — pure decisions for scheduling eligibility, readiness, and mandatory Radiologist review.
- `src/server/radiology/radiology-workflow.ts` — resource-locked scheduling, overlap detection, exam-linked identity verification, preparation status, X-ray pregnancy screening, Radiologist decision, and readiness DTO.

## API routes

### External lab and patient-record lifecycle

- `src/app/api/external-lab/intakes/route.ts` — Reception creates an external intake without an Encounter.
- `src/app/api/external-lab/referrals/worklist/route.ts` — Lab Staff worklist for external Doctor referrals.
- `src/app/api/external-lab/referrals/[referralId]/result/route.ts` — Lab Staff records the outside provider's result summary.
- `src/app/api/external-lab/referrals/[referralId]/review/route.ts` — assigned Doctor reviews the external result.
- `src/app/api/external-lab/referrals/[referralId]/cancel/route.ts` — assigned Doctor cancels a referral before result receipt.
- `src/app/api/doctor/encounters/[encounterId]/external-lab-referrals/route.ts` — assigned Doctor creates/lists external referrals for the Encounter.
- `src/app/api/clinic/patients/[patientId]/record-type/convert/route.ts` — Reception re-verifies identity and converts a diagnostic-only record to a full patient record.

### Radiology scheduling and preparation

- `src/app/api/radiology/worklist/route.ts` — Radiology Staff order/resource worklist.
- `src/app/api/radiology/order-items/[orderItemId]/schedule/route.ts` — resource allocation and future schedule.
- `src/app/api/radiology/exams/[examId]/identity-verification/route.ts` — exam-linked two-element identity check.
- `src/app/api/radiology/exams/[examId]/preparation/route.ts` — preparation outcome and reason.
- `src/app/api/radiology/exams/[examId]/pregnancy-screening/route.ts` — exam-day X-ray pregnancy screen.
- `src/app/api/radiology/pregnancy-review/worklist/route.ts` — Radiologist-only positive/declined review queue.
- `src/app/api/radiology/exams/[examId]/pregnancy-screening/review/route.ts` — Radiologist authorization/defer decision.
- `src/app/api/radiology/exams/[examId]/readiness/route.ts` — read-only exam readiness response for Phase 8I.

### Existing Lab routes updated for compatibility

The following existing paths are included because the service layer now supports both internal Encounter orders and external intake orders, and because external critical read-back must have its own actor/notes rule:

- `src/app/api/lab/worklist/route.ts`
- `src/app/api/lab/order-items/[orderItemId]/collect/route.ts`
- `src/app/api/lab/order-items/[orderItemId]/process/route.ts`
- `src/app/api/lab/order-items/[orderItemId]/result/route.ts`
- `src/app/api/lab/order-items/[orderItemId]/result/submit/route.ts`
- `src/app/api/lab/samples/[sampleId]/route.ts`
- `src/app/api/lab/results/worklist/route.ts`
- `src/app/api/lab/results/[resultId]/review/route.ts`
- `src/app/api/lab/results/[resultId]/release/route.ts`
- `src/app/api/lab/results/[resultId]/critical-communications/route.ts`
- `src/app/api/lab/critical-communications/worklist/route.ts`
- `src/app/api/lab/critical-communications/[communicationId]/acknowledge/route.ts`
- `src/app/api/lab/critical-communications/[communicationId]/acknowledge-external/route.ts` — external-provider read-back.
- `src/app/api/lab/critical-communications/[communicationId]/escalate/route.ts`

## Tests

- New unit files: `external-lab-policy.test.ts`, `external-lab-validation.test.ts`, `external-radiology-migration.test.ts`, `radiology-scheduling-validation.test.ts`, and `radiology-workflow-policy.test.ts` (61 new test cases total).
- `tests/e2e/external-lab-radiology.spec.ts` — 17 protected-route cases plus forged-field checks (19 E2E cases total).
- Existing Lab E2E/unit test files are included where the Update 69 compatibility package keeps their contract aligned with the revised service layer.

## Documentation

- `docs/clinical/phase-8f-external-laboratory-and-diagnostic-intake.md`
- `docs/clinical/phase-8g-8h-radiology-scheduling-and-preparation.md`
- `docs/implementation-roadmap.md` (replace)
- `README.md` (replace)
- `APPLY_UPDATE_69.md`
- `UPDATE_69_FILE_GUIDE.md`
- `UPDATE_69_SUMMARY.txt`
