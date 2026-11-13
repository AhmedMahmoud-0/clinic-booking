# Apply MERUNO Update 78

## Prerequisites

- Update 77 is applied and locally verified.
- Phase 9B / Update 72 billing components, services, and API routes remain in the project.
- The current database already contains the existing `Complaint`, `ComplaintEvent`, `IncidentReport`, and `AuditLog` models from the established Phase 2 schema.

## Apply

1. Stop any running `npm run dev` process before applying or running Playwright.
2. Extract this ZIP into the project root, preserving the `src`, `tests`, and `docs` folders.
3. Add all new files listed in `UPDATE_78_FILE_GUIDE.md`.
4. Replace only `src/components/clinic-manager/clinic-manager-shell.tsx` with the included version. Keep unrelated local changes.
5. Do not replace the Phase 9B billing workbenches or their APIs; Update 78 imports and reuses them.
6. Preserve the existing Update 76 patient complaint endpoint. Reception intake is a separate, permission-protected operation that records the receiving employee and a PHONE/IN_PERSON source.
7. Do not edit `.env`, `.git`, `node_modules`, `.next`, generated Prisma files, lockfiles, local databases, or migration history.

## Verification

Run in this order and stop at the first failure:

```powershell
npm run typecheck
npm run lint
npx vitest run tests/unit/clinic-manager-operations-policy.test.ts
npx playwright test tests/e2e/clinic-manager-operations.spec.ts --workers=1 --reporter=list
npm run build
```

Playwright should manage its own web server. Do not leave a second `npm run dev` running on the same port.

## Expected new routes

- `/reception/complaints` — Reception-only phone/in-person complaint intake. The server derives the receiving employee, channel is constrained to PHONE/IN_PERSON, and patient IDs/status/reference numbers cannot be supplied by the browser.
- `/clinic-manager/complaints`
- `/clinic-manager/incidents`
- `/clinic-manager/billing/approvals`
- `/clinic-manager/reports/operations`
- `/clinic-manager/reports/financial`

## Database note

No Prisma schema, migration, seed, dependency, or package-manifest changes are included. No database migration command is required for this update.
