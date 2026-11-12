# Phase 8I–8J — Radiology execution, reporting, critical communication, and external results

## 8I — Internal examination execution

1. Radiology Staff see scheduled exams in the execution worklist.
2. Starting an exam rechecks the same identity, preparation, procedure-modality, and exam-day pregnancy-screening state used by the readiness endpoint. It also rejects a cancelled or otherwise inactive parent order. The server locks the exam and order item and moves the exam/order item/order to `IN_PROGRESS` atomically.
3. Only an in-progress exam can be completed. The server records the performer and completion time; the order item becomes `COMPLETED`. The parent radiology order becomes `COMPLETED` only when every item is completed or cancelled.
4. Only a completed exam can receive a report draft. A Radiologist authors findings and impression, with optional recommendations. A report marked critical must include a specific reason.
5. The author submits the draft for approval. A different active Radiologist must independently approve it or request changes. Review history is append-only; a changes-requested report returns to `DRAFT` for editing by its original author.
6. A Radiologist releases only an approved report. The release operation is separate from approval.

## 8J — Critical results and ordering-Doctor review

- Critical status is explicitly selected and reasoned by the Radiologist; the system does not infer criticality from free text or create automated medical thresholds.
- A critical communication can be recorded only for an approved report marked critical. The notification to the assigned Doctor is generic and contains no report content.
- The assigned Doctor may securely access the approved critical report before release once a read-back communication has been recorded, including after acknowledgement while the report awaits final release. The Doctor must explicitly confirm read-back. Radiology Staff or a Radiologist can escalate an unacknowledged communication with a reason. Escalation does not satisfy the release gate.
- A critical report cannot be released until at least one read-back communication exists and every recorded communication is acknowledged with a server timestamp.
- After release, only the Doctor assigned to the originating Encounter can retrieve the report and record `REVIEWED` or `FOLLOW_UP_REQUIRED`. Follow-up requires notes.

## External radiology results

- The assigned Doctor can create an external radiology referral only for an active Encounter assigned to that Doctor.
- Referral creation records a granted `EXTERNAL_DIAGNOSTIC_DATA_SHARING` consent. The signer must be the patient or a currently verified legal guardian. A PostgreSQL trigger independently verifies that the consent belongs to the Encounter's Patient and has the required scope and granted decision.
- Radiology Staff receive a text summary of findings, impression, optional recommendations, and the external performance date. The external result is not represented as a clinic-performed exam or internal RadiologyReport.
- The external result is visible only to the assigned Doctor, who records `REVIEWED` or `FOLLOW_UP_REQUIRED`; follow-up requires notes.
- The API notification is generic and does not include clinical content.

## Endpoints

### Radiology Staff

- `GET /api/radiology/execution/worklist`
- `POST /api/radiology/exams/:examId/start`
- `POST /api/radiology/exams/:examId/complete`
- `GET /api/radiology/critical-communications/worklist`
- `POST /api/radiology/reports/:reportId/critical-communications`
- `POST /api/radiology/critical-communications/:communicationId/escalate`
- `GET /api/external-radiology/referrals/worklist`
- `POST /api/external-radiology/referrals/:referralId/result`

### Radiologist

- `POST /api/radiology/exams/:examId/report`
- `PUT /api/radiology/reports/:reportId`
- `GET /api/radiology/reports/worklist`
- `POST /api/radiology/reports/:reportId/submit`
- `POST /api/radiology/reports/:reportId/review`
- `POST /api/radiology/reports/:reportId/release`
- `POST /api/radiology/reports/:reportId/critical-communications`
- `GET /api/radiology/critical-communications/worklist`
- `POST /api/radiology/critical-communications/:communicationId/escalate`

### Ordering Doctor

- `GET /api/doctor/radiology-reports/:reportId`
- `POST /api/doctor/radiology-reports/:reportId/review`
- `GET /api/doctor/encounters/:encounterId/external-radiology-referrals`
- `POST /api/doctor/encounters/:encounterId/external-radiology-referrals`
- `GET /api/doctor/external-radiology-referrals/:referralId`
- `POST /api/doctor/external-radiology-referrals/:referralId/review`
- `POST /api/radiology/critical-communications/:communicationId/acknowledge`

## Migration and compatibility

Migration 16 adds the report criticality fields, a separate external radiology referral/result model, foreign keys, lookup indexes, lifecycle checks, and the database-level matching-consent trigger. Existing internal `RadiologyReport`, review, clinical-review, and critical-communication tables are reused. No existing records are dropped or reset.

## Boundaries

- Synthetic demo data only.
- Only the existing digital X-ray and ultrasound catalog modalities are supported.
- External results are structured text summaries; no binary upload, PACS, DICOM, CT, MRI, mammography, or automated image interpretation is introduced.
- Secure delivery in this increment is the protected assigned-Doctor API and generic in-app notification. Patient-portal result delivery remains in Phase 10.
- Separate authorization is enforced: Radiology Staff have exam-execution access; Radiologists have report approval access; both receive a narrow critical-communication permission; the Doctor can only acknowledge a communication for the assigned Encounter.
- No staff UI is included; this increment is API/data-layer work for the later workspaces.
