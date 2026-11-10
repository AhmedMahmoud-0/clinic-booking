# MERUNO Update 36 — File-by-file guide

| File | Purpose |
|---|---|
| `patient-document-errors.ts` | Stable domain errors and HTTP statuses. |
| `patient-document-validation.ts` | Enforces PDF/JPEG/PNG allowlist, 10 MiB cap, extension/MIME/signature agreement, filename sanitization, and SHA-256. |
| `patient-document-storage-path.ts` | Validates opaque UUID keys and resolves them only below the private storage root. |
| `patient-document-storage.ts` | Node-only local development adapter; atomic write, private file modes where supported, and production fail-closed behavior. |
| `patient-document-http.ts` | Bounded multipart body read and safe error-response mapping. |
| `patient-documents.ts` | Patient ownership/state checks, Attachment metadata transaction, compensating file cleanup, audit events, and download integrity verification. |
| `documents/route.ts` | Reception-only document list and upload endpoints. |
| `documents/[documentId]/route.ts` | Reception-only protected download endpoint; no public storage URL. |
| Three unit suites | File validation, path safety, and role permission coverage. |
| `patient-documents.spec.ts` | Three unauthenticated E2E checks for list, upload, and download. |
| `docs/patients/phase-5d-patient-documents.md` | API contract, permission boundary, local storage limitation, and non-goals. |
| `README.md`, `docs/implementation-roadmap.md` | Updated project status and Phase 5D record. |
