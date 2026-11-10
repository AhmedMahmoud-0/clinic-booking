# Apply MERUNO Update 35 — Phase 5C Patient Contacts & Consents

## 1. Before applying

1. Back up or commit the current project state after Update 34.
2. Extract this ZIP into the existing `clinic-booking` project root and merge folders.
3. Add new files and replace only the files listed below.
4. Keep `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma7.config.ts`, and the existing five migration folders. Do not replace your current database.

## 2. Files to add

- `prisma/migrations/20261108030000_patient_contacts_and_consents/migration.sql`
- `src/server/patient-management/patient-contact-consent-validation.ts`
- `src/server/patient-management/patient-consent-policy.ts`
- `src/server/patient-management/patient-contact-consent-errors.ts`
- `src/server/patient-management/patient-contact-profile.ts`
- `src/server/patient-management/patient-consents.ts`
- `src/server/patient-management/patient-contact-consent-http.ts`
- `src/app/api/clinic/patients/[patientId]/contact-profile/route.ts`
- `src/app/api/clinic/patients/[patientId]/consents/route.ts`
- `tests/unit/patient-contact-consent-validation.test.ts`
- `tests/unit/patient-consent-policy.test.ts`
- `tests/unit/patient-contact-consent-permission.test.ts`
- `tests/unit/patient-contact-consent-migration.test.ts`
- `tests/e2e/patient-contact-consent.spec.ts`
- `docs/patients/phase-5c-patient-contacts-and-consents.md`

## 3. Files to replace

- `prisma/schema.prisma`
- `src/server/auth/authorization/types.ts`
- `src/server/auth/authorization/policy.ts`
- `README.md`
- `docs/implementation-roadmap.md`

The Prisma schema is based on the latest Update 29 schema snapshot. No later update changed the Prisma model definitions; Updates 31–34 changed services, routes, policy and documentation only. The new migration is additive and preserves existing records.

## 4. Database and Prisma steps

The developer last confirmed five migrations were applied. After extracting Update 35, first verify that status: `npm run db:migrate:status` should show five applied and the new sixth migration pending. Review `prisma/migrations/20261108030000_patient_contacts_and_consents/migration.sql`, then run in order:

```powershell
npm run db:validate
npm run db:generate
npm run db:migrate:status
npx prisma migrate deploy --config=./prisma7.config.ts
npm run db:migrate:status
```

Expected after deployment: six migrations found and `Database schema is up to date!`. Do not run `db push`, `migrate reset`, `db:seed`, or regenerate/replace migration history. No existing contact or patient records are rewritten; `PatientContact.isActive` defaults to true.

## 5. What is preserved

- Phone/email values are deactivated rather than deleted when no longer current. Addresses and emergency contacts follow the same active/inactive history approach.
- Consent is append-only. Grant, refusal, and withdrawal are separate events. There is no PATCH or DELETE consent endpoint; a database trigger blocks direct update/delete.
- Adult consent must be signed by the subject patient. A minor's consent must be signed by an already verified legal guardian.
- Audit logs do not include contact details, address text, emergency contact names/phones, or submitted identity values.
- This phase does not create portal consent capture or procedure-specific treatment consent UI.

## 6. Dependencies

No new npm dependency and no package script change. Run Prisma Client generation because the schema adds new models and fields. No seed is required.

## 7. Validation commands

After the sixth migration is applied, run exactly in this order:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The expected suite is 259 Unit tests and 33 E2E tests, assuming the existing 204 Unit / 29 E2E baseline is unchanged. The new suites add 55 Unit tests and 4 E2E tests.
