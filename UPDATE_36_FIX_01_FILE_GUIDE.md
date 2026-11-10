# Update 36 Fix 01 — File Guide

| File | Action | Purpose |
| --- | --- | --- |
| `src/server/auth/authorization/policy.ts` | Replace | Removes the accidental patient administrative document read/upload permissions from Doctor. Reception remains the only employee role with those permissions. |
| `tests/unit/patient-document-storage-path.test.ts` | Replace | Makes the expected absolute path platform-aware by using `node:path.resolve`, fixing the Windows-only assertion mismatch without changing storage implementation. |
| `src/app/api/clinic/patients/[patientId]/documents/[documentId]/route.ts` | Replace | Removes an unused import flagged by ESLint. The download handler's behavior and response contract remain unchanged. |
| `README.md` | Replace | Refreshes the implementation status and records the Fix 01 changes. |
| `docs/implementation-roadmap.md` | Replace | Records the permission correction, cross-platform path test, and pending local verification. |

No files are added by this fix. No database or dependency changes are required.
