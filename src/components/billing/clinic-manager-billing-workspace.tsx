"use client";

import { BillingFinancialReportsWorkbench, type BillingFinancialReportsWorkbenchProps } from "./billing-financial-reports-workbench";
import { ClinicManagerBillingApprovalsWorkbench, type ClinicManagerBillingApprovalsWorkbenchProps } from "./clinic-manager-billing-approvals-workbench";

export type ClinicManagerBillingWorkspaceProps = {
  approvalsCopy: ClinicManagerBillingApprovalsWorkbenchProps["copy"];
  reportsCopy: BillingFinancialReportsWorkbenchProps["copy"];
  locale: string;
};

export function ClinicManagerBillingWorkspace({ approvalsCopy, reportsCopy, locale }: ClinicManagerBillingWorkspaceProps) {
  return (
    <div className="space-y-6">
      <ClinicManagerBillingApprovalsWorkbench copy={approvalsCopy} locale={locale} />
      <BillingFinancialReportsWorkbench copy={reportsCopy} locale={locale} />
    </div>
  );
}
