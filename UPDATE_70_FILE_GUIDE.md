# Update 70 — File Guide

## Prisma / database

- `prisma/schema.prisma` — complete schema snapshot based on the verified Update 69 package, including Update 70's external radiology model and report criticality fields.
- `prisma/migrations/20261111020000_radiology_execution_reporting_and_external_results/migration.sql` — Migration 16.

## Authorization

- `src/server/auth/authorization/types.ts` — adds the narrow critical-communication permission.
- `src/server/auth/authorization/policy.ts` — grants it only to Radiology Staff and Radiologists; existing report and execution permissions remain separate.

## Radiology domain services

- `src/server/radiology/radiology-phase-8i-j-validation.ts` — strict Zod request schemas for execution, report lifecycle, critical communication, and external radiology.
- `src/server/radiology/radiology-phase-8i-j-policy.ts` — pure transition policies.
- `src/server/radiology/radiology-phase-8i-j.ts` — protected transaction-backed operations and minimal DTO worklists/results.

## API routes

- `src/app/api/radiology/execution/worklist/route.ts`
- `src/app/api/radiology/exams/[examId]/start/route.ts`
- `src/app/api/radiology/exams/[examId]/complete/route.ts`
- `src/app/api/radiology/exams/[examId]/report/route.ts`
- `src/app/api/radiology/reports/[reportId]/route.ts`
- `src/app/api/radiology/reports/worklist/route.ts`
- `src/app/api/radiology/reports/[reportId]/submit/route.ts`
- `src/app/api/radiology/reports/[reportId]/review/route.ts`
- `src/app/api/radiology/reports/[reportId]/release/route.ts`
- `src/app/api/radiology/reports/[reportId]/critical-communications/route.ts`
- `src/app/api/radiology/critical-communications/worklist/route.ts`
- `src/app/api/radiology/critical-communications/[communicationId]/acknowledge/route.ts`
- `src/app/api/radiology/critical-communications/[communicationId]/escalate/route.ts`
- `src/app/api/doctor/radiology-reports/[reportId]/route.ts`
- `src/app/api/doctor/radiology-reports/[reportId]/review/route.ts`
- `src/app/api/doctor/encounters/[encounterId]/external-radiology-referrals/route.ts`
- `src/app/api/external-radiology/referrals/worklist/route.ts`
- `src/app/api/external-radiology/referrals/[referralId]/result/route.ts`
- `src/app/api/doctor/external-radiology-referrals/[referralId]/route.ts`
- `src/app/api/doctor/external-radiology-referrals/[referralId]/review/route.ts`

## Tests

- `tests/unit/radiology-phase-8i-j-policy.test.ts`
- `tests/unit/radiology-phase-8i-j-authorization.test.ts`
- `tests/unit/radiology-phase-8i-j-validation.test.ts`
- `tests/unit/radiology-phase-8i-j-migration.test.ts`
- `tests/e2e/radiology-execution-reporting.spec.ts`

## Documentation

- `docs/implementation-roadmap.md` — phase status and Update 70 roadmap scope.
- `docs/clinical/phase-8i-8j-radiology-execution-reporting-and-external-results.md` — workflow contract, endpoints, and boundaries.
- `APPLY_UPDATE_70.md` — application and validation sequence.
- `UPDATE_70_SUMMARY.txt` — concise scope and validation-boundary summary.

## Compatibility notes

This archive is an incremental update package plus the complete Prisma schema snapshot. Do not replace the whole project with this archive. Preserve the files already in the project and merge/overwrite only the listed paths. Migration 16 must be applied using the existing Prisma migration history; do not use `db push`, reset, or migration regeneration.
