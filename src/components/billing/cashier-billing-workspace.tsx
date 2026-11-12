"use client";

import { CashierInvoiceWorkbench, type CashierBillingCopy } from "./cashier-invoice-workbench";
import type { CashierInvoiceAdjustmentsCopy } from "./cashier-invoice-adjustments-workbench";
import type { CashierRefundExecutionWorkbenchProps } from "./cashier-refund-execution-workbench";
import { BillingFinancialReportsWorkbench, type BillingFinancialReportsWorkbenchProps } from "./billing-financial-reports-workbench";

export type CashierBillingWorkspaceProps = {
  invoiceCopy: CashierBillingCopy;
  adjustmentsCopy: CashierInvoiceAdjustmentsCopy;
  refundExecutionCopy: CashierRefundExecutionWorkbenchProps["copy"];
  reportsCopy: BillingFinancialReportsWorkbenchProps["copy"];
  locale: string;
};

export function CashierBillingWorkspace({ invoiceCopy, adjustmentsCopy, refundExecutionCopy, reportsCopy, locale }: CashierBillingWorkspaceProps) {
  return (
    <div className="space-y-6">
      <CashierInvoiceWorkbench copy={invoiceCopy} adjustmentsCopy={adjustmentsCopy} refundExecutionCopy={refundExecutionCopy} locale={locale} />
      <BillingFinancialReportsWorkbench copy={reportsCopy} locale={locale} />
    </div>
  );
}
