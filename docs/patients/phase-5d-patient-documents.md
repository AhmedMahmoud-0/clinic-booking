# Phase 5D — Patient attachments and documents (Update 36)

## Scope

This increment supports patient-level administrative attachments only. It reuses the existing `Attachment` model with `purpose = PATIENT_DOCUMENT`, `patientId`, `storageKey`, `mimeType`, `sizeBytes`, `checksumSha256`, `uploadedByEmployeeId`, and `uploadedAt`. No schema or migration change is required.

Reception is the only role allowed to list, upload, or download these documents in this increment. The `patient.basic.read` permission does not imply document access. Doctors, nurses, laboratory/radiology staff, cashiers, Clinic Manager, and System Admin receive no patient-document permission here. Clinical, laboratory, radiology, complaint, and incident evidence files remain in their respective workflows and permission boundaries.

## File contract

- Accepted: PDF, JPEG, PNG; extension, declared MIME type, and file signature must agree. A neutral or missing MIME type is accepted only when the filename extension and signature agree.
- Maximum file size: 10 MiB. The multipart request is read through a bounded stream before parsing.
- Server sanitizes the display filename. A client filename is never used as a filesystem path.
- Storage key is a server-generated UUID under `patient-documents/`; it is never returned by the APIs.
- SHA-256 and size are checked again on download. A mismatch blocks delivery.
- Downloads use `Content-Disposition: attachment`, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`. No public URL or inline preview is created.
- Audit events record the entity and operation only. They do not include file bytes, filename, checksum, patient details, or document contents.
- No edit/delete API is provided.

## Local storage and production boundary

The development adapter writes outside the repository by default to `<user-home>/.meruno/private-storage/patient-documents/`. The optional `PATIENT_DOCUMENT_STORAGE_DIR` must be an absolute private directory outside the repository; the adapter uses a `patient-documents/` child namespace. Files are not placed in `public/` or a Git-tracked directory.

The local filesystem adapter deliberately returns 503 when `NODE_ENV=production`. This is not a persistent Vercel/serverless storage solution. Before enabling production uploads, implement and configure a private durable object-storage adapter with server-only credentials, encryption/access controls, lifecycle/backup policy, and malware scanning as required by the deployment risk assessment. Signature checks are not malware scanning.

## APIs

- `GET /api/clinic/patients/{patientId}/documents` — list minimal metadata.
- `POST /api/clinic/patients/{patientId}/documents` — same-origin multipart upload with exactly one `file` field.
- `GET /api/clinic/patients/{patientId}/documents/{documentId}` — verify patient ownership, active patient state, file size and checksum, audit, and stream as an attachment.

Every route requires an active verified employee context and the operation-specific patient-document permission.

## Out of scope

Patient-portal downloads, clinical notes and encounter attachments, lab/radiology source files and reports, complaint/incident evidence, previews, deletion/retention UI, storage-provider integration, OCR, and virus scanning are not implemented here.
