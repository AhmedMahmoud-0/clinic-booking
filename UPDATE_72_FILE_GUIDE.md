# MERUNO Update 72 — File Guide

## Replace existing files

- `prisma/schema.prisma`
- `src/app/api/cashier/invoices/route.ts`
- `src/app/api/cashier/invoices/[invoiceId]/issue/route.ts`
- `src/components/billing/cashier-invoice-workbench.tsx`
- `src/server/billing/billing-phase-9a.ts`
- `docs/implementation-roadmap.md`

## Add new files

- `prisma/migrations/20261112010000_billing_phase_9b_discounts_refunds_and_external_invoices/migration.sql`
- `src/app/api/billing/reports/financial/route.ts`
- `src/app/api/cashier/invoices/[invoiceId]/discount-requests/route.ts`
- `src/app/api/cashier/invoices/[invoiceId]/refund-requests/route.ts`
- `src/app/api/cashier/invoices/eligible-external-intakes/route.ts`
- `src/app/api/cashier/refunds/[refundId]/complete/route.ts`
- `src/app/api/cashier/refunds/worklist/route.ts`
- `src/app/api/clinic-manager/billing/discount-approvals/[approvalId]/decision/route.ts`
- `src/app/api/clinic-manager/billing/discount-approvals/route.ts`
- `src/app/api/clinic-manager/billing/refund-approvals/[refundId]/decision/route.ts`
- `src/app/api/clinic-manager/billing/refund-approvals/route.ts`
- `src/components/billing/billing-financial-reports-workbench.tsx`
- `src/components/billing/cashier-billing-workspace.tsx`
- `src/components/billing/cashier-invoice-adjustments-workbench.tsx`
- `src/components/billing/cashier-refund-execution-workbench.tsx`
- `src/components/billing/clinic-manager-billing-approvals-workbench.tsx`
- `src/components/billing/clinic-manager-billing-workspace.tsx`
- `src/server/billing/billing-phase-9b-policy.ts`
- `src/server/billing/billing-phase-9b-validation.ts`
- `src/server/billing/billing-phase-9b.ts`
- `tests/e2e/billing-phase-9b.spec.ts`
- `tests/unit/billing-phase-9b-authorization.test.ts`
- `tests/unit/billing-phase-9b-migration.test.ts`
- `tests/unit/billing-phase-9b-policy.test.ts`
- `tests/unit/billing-phase-9b-validation.test.ts`
- `docs/billing/phase-9b-discounts-refunds-external-invoices-and-reports.md`
- `APPLY_UPDATE_72.md`
- `UPDATE_72_FILE_GUIDE.md`
- `UPDATE_72_SUMMARY.txt`

## Notes

- 6 paths are replaced; the rest are added.
- `prisma/schema.prisma` is based on the verified Update 71 schema plus the Phase 9B additions. Preserve unrelated local changes if any were made after Update 71.
- The only database change is the new incremental migration. No `db push`, destructive migration, database reset, seed, dependency, or environment change is included.
- The Cashier and Clinic Manager composition components must be mounted in the existing workspace pages and wired to existing translation dictionaries as described in `APPLY_UPDATE_72.md`.
