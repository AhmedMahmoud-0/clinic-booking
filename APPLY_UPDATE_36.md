# Apply MERUNO Update 36 — Phase 5D Patient Attachments & Documents

## 1. Before applying

1. Back up or commit the current project after Update 35 Fix 01.
2. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
3. Add the new files listed in `UPDATE_36_FILE_GUIDE.md`.
4. Replace only `src/server/auth/authorization/types.ts`, `src/server/auth/authorization/policy.ts`, `README.md`, and `docs/implementation-roadmap.md`.
5. Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, `prisma/schema.prisma`, `prisma/migrations`, or your local database.

## 2. Database and dependencies

- No Prisma schema change or migration.
- No `db push`, migrate command, reset, seed, or Prisma Client generation.
- No package/dependency/script change.
- Uses the existing `Attachment` model and `PATIENT_DOCUMENT` purpose.

## 3. Private local storage

Development files default to `<user-home>/.meruno/private-storage/patient-documents/` (Windows: `%USERPROFILE%\.meruno\private-storage\patient-documents\`). Optional `PATIENT_DOCUMENT_STORAGE_DIR` is an absolute private base directory; the adapter creates a `patient-documents` child directory. Keep it outside the repository and back it up separately if needed.

The filesystem adapter returns HTTP 503 in production. Do not use it on Vercel/serverless. A persistent private object-storage adapter must be implemented before production uploads are enabled. No cloud provider is selected by this update.

## 4. Security and behavior

- Reception-only permissions for listing, upload, and download; no role inherits document access from `patient.basic.read`.
- `GET /api/clinic/patients/{patientId}/documents` returns metadata only.
- `POST /api/clinic/patients/{patientId}/documents` accepts exactly one same-origin multipart `file` field.
- `GET /api/clinic/patients/{patientId}/documents/{documentId}` checks ownership, active patient state, byte count, and SHA-256 before attachment download.
- Allowed PDF/JPEG/PNG; maximum 10 MiB. Storage keys are server-generated and never exposed.
- Audit records contain no filename, bytes, checksum, or patient details.
- No edit/delete endpoint, public URL, inline preview, malware scanning, OCR, or patient portal download.

Patient-level administrative attachments only. Clinical, lab, radiology, complaint, and incident files remain separate future workflows.

## 5. Validation

No database command is needed. From the project root, run these five commands in this exact order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Expected additions: 28 unit tests across 3 new files? The unit suites add 28 assertions/tests (17 validation, 5 storage path, 6 permission), and 3 E2E tests. Existing test totals depend on your current baseline. These checks have not been executed against your local full project in this environment. Share the complete first failing output and stop there; do not run migrations for this update.
