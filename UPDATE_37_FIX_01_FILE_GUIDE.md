# Update 37 Fix 01 — File Guide

| File | Action | Purpose |
|---|---|---|
| `prisma/migrations/20261108040000_patient_family_relationships_guardian_workflows/migration.sql` | Replace | Makes the failed seventh migration resumable after partial PostgreSQL DDL, tolerates the absent prior check constraint, and safely handles already-created enum/columns/indexes/functions/triggers. |
| `tests/unit/patient-relationship-migration.test.ts` | Replace | Updates migration-contract assertions and adds explicit coverage for retry/idempotency safeguards. |
| `APPLY_UPDATE_37_FIX_01.md` | Add | Safe backup, migration-state recovery, redeployment, and verification sequence. |
| `UPDATE_37_FIX_01_SUMMARY.txt` | Add | Concise fix summary and database impact. |
| `README.md` | Add | Package overview and warnings. |

## What this does not do

- It does not create another migration.
- It does not drop tables, columns, enum types, indexes, or patient data.
- It does not mark the migration as applied.
- It does not change the patient relationship or guardian-verification business rules.
