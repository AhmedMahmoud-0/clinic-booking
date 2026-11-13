import { ClinicManagerBillingApprovalsWorkbench } from "@/components/billing/clinic-manager-billing-approvals-workbench";

export default function ClinicManagerBillingApprovalsPage() {
  return <ClinicManagerBillingApprovalsWorkbench locale="en-GB" copy={{
    title: "Billing approvals",
    discountsTitle: "Pending discount requests",
    refundsTitle: "Pending refund requests",
    emptyDiscounts: "There are no pending discount requests.",
    emptyRefunds: "There are no pending refund requests.",
    invoice: "Invoice",
    patient: "Patient",
    requester: "Requested by",
    requestedAt: "Requested at",
    reason: "Reason",
    amount: "Amount",
    subtotal: "Subtotal",
    currentDiscount: "Current discount",
    total: "Current total",
    approve: "Approve",
    reject: "Reject",
    rejectionReason: "Decision note (required when rejecting)",
    rejectionReasonPlaceholder: "Enter a reason for rejection",
    items: "Refunded invoice items",
    loading: "Saving…",
    refresh: "Refresh approvals",
    genericError: "Billing approvals could not be loaded or updated.",
    requiredRejectionReason: "Enter a rejection reason of at least 3 characters.",
    approved: "The request was approved.",
    rejected: "The request was rejected.",
  }} />;
}
