import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { BillingWorkflowError, createOrRefreshInvoiceDraft, issueInvoice } from "./billing-phase-9a";
import {
  allocateNetLineCents,
  canCompleteRefund,
  canDecideApproval,
  canRequestDiscount,
  canRequestRefund,
  isUnprovidedSource,
  reportNetCollectedCents,
} from "./billing-phase-9b-policy";
import type {
  BillingReportQuery,
  CompleteRefundRequest,
  DiscountRequest,
  ExternalIntakeCandidateQuery,
  ManagerDecision,
  RefundRequest,
} from "./billing-phase-9b-validation";

type Tx = Prisma.TransactionClient;

function fail(code: string, message: string, status = 409): never {
  throw new BillingWorkflowError(code, message, status);
}

function cents(value: Prisma.Decimal | number | string): number {
  return Number(new Prisma.Decimal(value).toDecimalPlaces(2).mul(100).toFixed(0));
}

function money(value: Prisma.Decimal | number | string): string {
  return new Prisma.Decimal(value).toFixed(2);
}

function reference(prefix: "MER-REF" | "MER-RFD" | "MER-INV"): string {
  const now = new Date();
  const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `${prefix}-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function lockInvoice(tx: Tx, invoiceId: string): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Invoice" WHERE "id" = ${invoiceId} FOR UPDATE
  `;
  if (rows.length !== 1) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);
}

async function requireActiveRole(tx: Tx, employeeId: string, role: "CASHIER" | "CLINIC_MANAGER"): Promise<void> {
  const employee = await tx.employee.findUnique({
    where: { id: employeeId },
    select: { status: true, roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } } },
  });
  if (!employee || employee.status !== "ACTIVE" || !employee.roleAssignments.some((item) => item.role === role)) {
    fail(role === "CASHIER" ? "BILLING_CASHIER_REQUIRED" : "BILLING_MANAGER_REQUIRED", `An active ${role === "CASHIER" ? "Cashier" : "Clinic Manager"} role is required.`, 403);
  }
}

async function audit(tx: Tx, employeeId: string, action: string, entityType: string, entityId: string, reason: string): Promise<void> {
  await tx.auditLog.create({
    data: { actorType: "EMPLOYEE", actorEmployeeId: employeeId, action, entityType, entityId, reason },
  });
}

export async function requestInvoiceDiscount(invoiceId: string, employeeId: string, input: DiscountRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireActiveRole(tx, employeeId, "CASHIER");
    await lockInvoice(tx, invoiceId);
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true, invoiceNumber: true, status: true, subtotal: true, discountTotal: true, currencyCode: true,
        discountApprovals: { where: { status: "PENDING" }, select: { id: true } },
      },
    });
    if (!invoice) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);
    const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
    const amountCents = cents(amount);
    const remainingCents = cents(invoice.subtotal.minus(invoice.discountTotal));
    if (!canRequestDiscount({ invoiceStatus: invoice.status, hasPendingRequest: invoice.discountApprovals.length > 0, amountCents, remainingCents })) {
      if (invoice.status !== "DRAFT") fail("BILLING_DISCOUNT_DRAFT_ONLY", "A discount can only be requested while the invoice is a draft.");
      if (invoice.discountApprovals.length > 0) fail("BILLING_DISCOUNT_PENDING", "This invoice already has a pending discount request.");
      fail("BILLING_DISCOUNT_AMOUNT_INVALID", "The requested discount exceeds the remaining invoice balance.");
    }
    const approval = await tx.discountApproval.create({
      data: { invoiceId, amount, reason: input.reason, requestedByEmployeeId: employeeId },
      select: { id: true, amount: true, reason: true, status: true, requestedAt: true },
    });
    await audit(tx, employeeId, "BILLING_DISCOUNT_REQUESTED", "DiscountApproval", approval.id, input.reason);
    return {
      id: approval.id, invoiceNumber: invoice.invoiceNumber, amount: money(approval.amount), currencyCode: invoice.currencyCode,
      reason: approval.reason, status: approval.status, requestedAt: approval.requestedAt.toISOString(),
    };
  }, { isolationLevel: "Serializable" });
}

export async function getDiscountApprovalWorklist() {
  const prisma = getPrismaClient();
  const approvals = await prisma.discountApproval.findMany({
    where: { status: "PENDING" },
    orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true, amount: true, reason: true, requestedAt: true,
      requestedByEmployee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
      invoice: {
        select: {
          id: true, invoiceNumber: true, subtotal: true, discountTotal: true, total: true, currencyCode: true,
          patient: { select: { mrn: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  return {
    items: approvals.map((item) => ({
      id: item.id, amount: money(item.amount), reason: item.reason, requestedAt: item.requestedAt.toISOString(),
      requester: { employeeNumber: item.requestedByEmployee.employeeNumber, displayName: `${item.requestedByEmployee.firstName} ${item.requestedByEmployee.lastName}` },
      invoice: {
        id: item.invoice.id, invoiceNumber: item.invoice.invoiceNumber,
        patient: { mrn: item.invoice.patient.mrn, displayName: `${item.invoice.patient.firstName} ${item.invoice.patient.lastName}` },
        subtotal: money(item.invoice.subtotal), discountTotal: money(item.invoice.discountTotal), total: money(item.invoice.total), currencyCode: item.invoice.currencyCode,
      },
    })),
    limit: 100,
  };
}

export async function decideInvoiceDiscount(approvalId: string, employeeId: string, input: ManagerDecision) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireActiveRole(tx, employeeId, "CLINIC_MANAGER");
    const locator = await tx.discountApproval.findUnique({ where: { id: approvalId }, select: { invoiceId: true } });
    if (!locator) fail("BILLING_DISCOUNT_REQUEST_NOT_FOUND", "The discount request was not found.", 404);
    await lockInvoice(tx, locator.invoiceId);
    const approval = await tx.discountApproval.findUnique({
      where: { id: approvalId },
      select: { id: true, invoiceId: true, amount: true, reason: true, status: true, requestedByEmployeeId: true },
    });
    if (!approval) fail("BILLING_DISCOUNT_REQUEST_NOT_FOUND", "The discount request was not found.", 404);
    if (!canDecideApproval({ status: approval.status, requesterEmployeeId: approval.requestedByEmployeeId, decisionEmployeeId: employeeId })) {
      if (approval.requestedByEmployeeId === employeeId) fail("BILLING_SELF_APPROVAL_BLOCKED", "The requester cannot approve or reject their own request.", 403);
      fail("BILLING_DISCOUNT_ALREADY_DECIDED", "This discount request is no longer pending.");
    }
    const invoice = await tx.invoice.findUnique({ where: { id: approval.invoiceId }, select: { status: true, subtotal: true, discountTotal: true } });
    if (!invoice) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);
    if (input.decision === "APPROVE") {
      if (invoice.status !== "DRAFT" || approval.amount.greaterThan(invoice.subtotal.minus(invoice.discountTotal))) {
        fail("BILLING_DISCOUNT_NO_LONGER_APPLICABLE", "The invoice changed and this discount can no longer be applied.");
      }
      const newDiscount = invoice.discountTotal.plus(approval.amount).toDecimalPlaces(2);
      await tx.invoice.update({ where: { id: approval.invoiceId }, data: { discountTotal: newDiscount, total: invoice.subtotal.minus(newDiscount).toDecimalPlaces(2) } });
    }
    const decidedAt = new Date();
    const updated = await tx.discountApproval.update({
      where: { id: approval.id },
      data: { status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED", decidedByEmployeeId: employeeId, decidedAt },
      select: { id: true, status: true, amount: true },
    });
    await audit(tx, employeeId, input.decision === "APPROVE" ? "BILLING_DISCOUNT_APPROVED" : "BILLING_DISCOUNT_REJECTED", "DiscountApproval", updated.id, input.reason ?? approval.reason);
    return { id: updated.id, status: updated.status, amount: money(updated.amount), decidedAt: decidedAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

type RefundableInvoiceItem = {
  id: string;
  sourceType: string;
  lineTotal: Prisma.Decimal;
  labOrderItem: { status: string; result: { status: string } | null } | null;
  radiologyOrderItem: { status: string } | null;
};

function netItemAmounts(invoiceItems: Array<{ id: string; lineTotal: Prisma.Decimal }>, subtotal: Prisma.Decimal, discountTotal: Prisma.Decimal): Map<string, number> {
  return allocateNetLineCents(
    invoiceItems.map((item) => ({ id: item.id, grossCents: cents(item.lineTotal) })),
    cents(subtotal),
    cents(discountTotal),
  );
}

function validateApprovedRefundSnapshot(input: {
  refundId: string;
  refundAmount: Prisma.Decimal;
  refundItems: Array<{ invoiceItemId: string; amount: Prisma.Decimal; invoiceItem: RefundableInvoiceItem }>;
  invoiceStatus: string;
  invoiceSubtotal: Prisma.Decimal;
  invoiceDiscountTotal: Prisma.Decimal;
  invoiceItems: Array<{ id: string; lineTotal: Prisma.Decimal }>;
  appointmentStatus: string | null;
  hasCompletedPayment: boolean;
  reservedRefunds: Array<{ id: string; items: Array<{ invoiceItemId: string; amount: Prisma.Decimal }> }>;
}): void {
  if ((input.invoiceStatus !== "PAID" && input.invoiceStatus !== "PARTIALLY_REFUNDED") || !input.hasCompletedPayment) {
    fail("BILLING_REFUND_INVOICE_NOT_PAID", "The invoice no longer has an eligible completed payment.");
  }
  const netAmounts = netItemAmounts(input.invoiceItems, input.invoiceSubtotal, input.invoiceDiscountTotal);
  const reservedByItem = new Map<string, number>();
  for (const refund of input.reservedRefunds) {
    if (refund.id === input.refundId) continue;
    for (const item of refund.items) {
      reservedByItem.set(item.invoiceItemId, (reservedByItem.get(item.invoiceItemId) ?? 0) + cents(item.amount));
    }
  }
  let verifiedTotalCents = 0;
  for (const refundItem of input.refundItems) {
    const item = refundItem.invoiceItem;
    const isUnprovided = isUnprovidedSource({
      sourceType: item.sourceType,
      appointmentStatus: input.appointmentStatus,
      labItemStatus: item.labOrderItem?.status ?? null,
      labResultStatus: item.labOrderItem?.result?.status ?? null,
      radiologyItemStatus: item.radiologyOrderItem?.status ?? null,
    });
    const remainingCents = (netAmounts.get(refundItem.invoiceItemId) ?? 0)
      - (reservedByItem.get(refundItem.invoiceItemId) ?? 0);
    const requestedCents = cents(refundItem.amount);
    if (!isUnprovided || requestedCents <= 0 || requestedCents !== remainingCents) {
      fail("BILLING_REFUND_ITEM_NO_LONGER_ELIGIBLE", "A requested service is no longer eligible for the approved refund. Review the invoice and submit a new request if appropriate.");
    }
    verifiedTotalCents += requestedCents;
  }
  if (verifiedTotalCents !== cents(input.refundAmount)) {
    fail("BILLING_REFUND_AMOUNT_MISMATCH", "The refund amount no longer matches its selected invoice items.");
  }
}

export async function requestInvoiceRefund(invoiceId: string, employeeId: string, input: RefundRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireActiveRole(tx, employeeId, "CASHIER");
    await lockInvoice(tx, invoiceId);
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true, invoiceNumber: true, status: true, subtotal: true, discountTotal: true, total: true, currencyCode: true,
        payments: { where: { status: "COMPLETED" }, select: { id: true, method: true } },
        items: {
          select: {
            id: true, sourceType: true, lineTotal: true,
            labOrderItem: { select: { status: true, result: { select: { status: true } } } },
            radiologyOrderItem: { select: { status: true } },
          },
        },
        encounter: { select: { appointment: { select: { status: true } } } },
        refunds: {
          where: { status: { in: ["PENDING", "APPROVED", "COMPLETED"] } },
          select: { status: true, items: { select: { invoiceItemId: true, amount: true } } },
        },
      },
    });
    if (!invoice) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);
    if (invoice.payments.length !== 1) fail("BILLING_ORIGINAL_PAYMENT_AMBIGUOUS", "Exactly one completed original payment is required before requesting a refund.");
    const requestedIds = new Set(input.items.map((item) => item.invoiceItemId));
    const items = invoice.items as RefundableInvoiceItem[];
    const selected = items.filter((item) => requestedIds.has(item.id));
    if (selected.length !== requestedIds.size) fail("BILLING_REFUND_ITEM_NOT_FOUND", "One or more selected invoice items were not found on this invoice.", 404);
    const netAmounts = netItemAmounts(invoice.items, invoice.subtotal, invoice.discountTotal);
    const reservedByItem = new Map<string, number>();
    for (const refund of invoice.refunds) {
      for (const item of refund.items) reservedByItem.set(item.invoiceItemId, (reservedByItem.get(item.invoiceItemId) ?? 0) + cents(item.amount));
    }
    const payloadById = new Map(input.items.map((item) => [item.invoiceItemId, item]));
    const createItems: Array<{ invoiceItemId: string; amount: Prisma.Decimal; reason: string }> = [];
    for (const item of selected) {
      const unprovided = isUnprovidedSource({
        sourceType: item.sourceType,
        appointmentStatus: invoice.encounter?.appointment?.status ?? null,
        labItemStatus: item.labOrderItem?.status ?? null,
        labResultStatus: item.labOrderItem?.result?.status ?? null,
        radiologyItemStatus: item.radiologyOrderItem?.status ?? null,
      });
      const netCents = netAmounts.get(item.id) ?? 0;
      const remainingCents = netCents - (reservedByItem.get(item.id) ?? 0);
      if (!canRequestRefund({ invoiceStatus: invoice.status, hasCompletedPayment: invoice.payments.length === 1, itemIsUnprovided: unprovided, remainingRefundableCents: remainingCents })) {
        fail("BILLING_REFUND_ITEM_NOT_ELIGIBLE", "Only a previously invoiced service that was not provided and has not already been refunded can be selected.");
      }
      const itemInput = payloadById.get(item.id);
      createItems.push({ invoiceItemId: item.id, amount: new Prisma.Decimal(remainingCents).div(100).toDecimalPlaces(2), reason: itemInput?.reason ?? input.reason });
    }
    const total = createItems.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0)).toDecimalPlaces(2);
    const refund = await tx.refund.create({
      data: {
        refundReference: reference("MER-RFD"), invoiceId, amount: total, currencyCode: invoice.currencyCode,
        reason: input.reason, requestedByEmployeeId: employeeId,
        items: { create: createItems.map((item) => ({ invoiceItemId: item.invoiceItemId, amount: item.amount, reason: item.reason })) },
      },
      select: { id: true, refundReference: true, amount: true, status: true, requestedAt: true },
    });
    await audit(tx, employeeId, "BILLING_REFUND_REQUESTED", "Refund", refund.id, input.reason);
    return { ...refund, amount: money(refund.amount), currencyCode: invoice.currencyCode, requestedAt: refund.requestedAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function getRefundApprovalWorklist() {
  const prisma = getPrismaClient();
  const refunds = await prisma.refund.findMany({
    where: { status: "PENDING" },
    orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true, refundReference: true, amount: true, currencyCode: true, reason: true, requestedAt: true,
      requestedByEmployee: { select: { employeeNumber: true, firstName: true, lastName: true } },
      invoice: { select: { id: true, invoiceNumber: true, patient: { select: { mrn: true, firstName: true, lastName: true } } } },
      items: { select: { id: true, amount: true, reason: true, invoiceItem: { select: { description: true, sourceType: true } } } },
    },
  });
  return {
    items: refunds.map((refund) => ({
      id: refund.id, reference: refund.refundReference, amount: money(refund.amount), currencyCode: refund.currencyCode,
      reason: refund.reason, requestedAt: refund.requestedAt.toISOString(),
      requester: { employeeNumber: refund.requestedByEmployee.employeeNumber, displayName: `${refund.requestedByEmployee.firstName} ${refund.requestedByEmployee.lastName}` },
      invoice: { id: refund.invoice.id, invoiceNumber: refund.invoice.invoiceNumber, patient: { mrn: refund.invoice.patient.mrn, displayName: `${refund.invoice.patient.firstName} ${refund.invoice.patient.lastName}` } },
      items: refund.items.map((item) => ({ id: item.id, amount: money(item.amount), reason: item.reason, description: item.invoiceItem.description, sourceType: item.invoiceItem.sourceType })),
    })),
    limit: 100,
  };
}

export async function getApprovedRefundExecutionWorklist() {
  const prisma = getPrismaClient();
  const refunds = await prisma.refund.findMany({
    where: { status: "APPROVED" },
    orderBy: [{ approvedAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true, refundReference: true, amount: true, currencyCode: true, reason: true, approvedAt: true,
      invoice: {
        select: {
          id: true, invoiceNumber: true,
          patient: { select: { mrn: true, firstName: true, lastName: true } },
          payments: { where: { status: "COMPLETED" }, select: { method: true } },
        },
      },
    },
  });
  return {
    items: refunds.map((refund) => ({
      id: refund.id,
      reference: refund.refundReference,
      amount: money(refund.amount),
      currencyCode: refund.currencyCode,
      reason: refund.reason,
      approvedAt: refund.approvedAt?.toISOString() ?? null,
      invoice: {
        id: refund.invoice.id,
        invoiceNumber: refund.invoice.invoiceNumber,
        patient: { mrn: refund.invoice.patient.mrn, displayName: `${refund.invoice.patient.firstName} ${refund.invoice.patient.lastName}` },
      },
      originalPaymentMethod: refund.invoice.payments.length === 1 ? refund.invoice.payments[0].method : null,
      originalPaymentCount: refund.invoice.payments.length,
    })),
    limit: 100,
  };
}

export async function decideInvoiceRefund(refundId: string, employeeId: string, input: ManagerDecision) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireActiveRole(tx, employeeId, "CLINIC_MANAGER");
    const locator = await tx.refund.findUnique({ where: { id: refundId }, select: { invoiceId: true } });
    if (!locator) fail("BILLING_REFUND_NOT_FOUND", "The refund request was not found.", 404);
    await lockInvoice(tx, locator.invoiceId);
    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      select: {
        id: true, invoiceId: true, amount: true, reason: true, status: true, requestedByEmployeeId: true,
        items: { select: { invoiceItemId: true, amount: true, invoiceItem: { select: {
          id: true, sourceType: true, lineTotal: true,
          labOrderItem: { select: { status: true, result: { select: { status: true } } } },
          radiologyOrderItem: { select: { status: true } },
        } } } },
        invoice: { select: {
          status: true, subtotal: true, discountTotal: true,
          payments: { where: { status: "COMPLETED" }, select: { id: true } },
          items: { select: { id: true, lineTotal: true } },
          encounter: { select: { appointment: { select: { status: true } } } },
          refunds: { where: { status: { in: ["PENDING", "APPROVED", "COMPLETED"] } }, select: {
            id: true, items: { select: { invoiceItemId: true, amount: true } },
          } },
        } },
      },
    });
    if (!refund) fail("BILLING_REFUND_NOT_FOUND", "The refund request was not found.", 404);
    if (!canDecideApproval({ status: refund.status, requesterEmployeeId: refund.requestedByEmployeeId, decisionEmployeeId: employeeId })) {
      if (refund.requestedByEmployeeId === employeeId) fail("BILLING_SELF_APPROVAL_BLOCKED", "The requester cannot approve or reject their own request.", 403);
      fail("BILLING_REFUND_ALREADY_DECIDED", "This refund request is no longer pending.");
    }
    if (input.decision === "APPROVE") {
      validateApprovedRefundSnapshot({
        refundId: refund.id,
        refundAmount: refund.amount,
        refundItems: refund.items,
        invoiceStatus: refund.invoice.status,
        invoiceSubtotal: refund.invoice.subtotal,
        invoiceDiscountTotal: refund.invoice.discountTotal,
        invoiceItems: refund.invoice.items,
        appointmentStatus: refund.invoice.encounter?.appointment?.status ?? null,
        hasCompletedPayment: refund.invoice.payments.length === 1,
        reservedRefunds: refund.invoice.refunds,
      });
    }
    const decidedAt = new Date();
    const updated = await tx.refund.update({
      where: { id: refund.id },
      data: {
        status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
        approvedByEmployeeId: input.decision === "APPROVE" ? employeeId : null,
        approvedAt: input.decision === "APPROVE" ? decidedAt : null,
        decidedByEmployeeId: employeeId,
        decidedAt,
      },
      select: { id: true, refundReference: true, status: true, amount: true },
    });
    await audit(tx, employeeId, input.decision === "APPROVE" ? "BILLING_REFUND_APPROVED" : "BILLING_REFUND_REJECTED", "Refund", refund.id, input.reason ?? refund.reason);
    return { id: updated.id, reference: updated.refundReference, status: updated.status, amount: money(updated.amount), decidedAt: decidedAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function completeInvoiceRefund(refundId: string, employeeId: string, input: CompleteRefundRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireActiveRole(tx, employeeId, "CASHIER");
    const locator = await tx.refund.findUnique({ where: { id: refundId }, select: { invoiceId: true } });
    if (!locator) fail("BILLING_REFUND_NOT_FOUND", "The refund was not found.", 404);
    await lockInvoice(tx, locator.invoiceId);
    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      select: {
        id: true, invoiceId: true, amount: true, currencyCode: true, status: true,
        items: { select: { invoiceItemId: true, amount: true, invoiceItem: { select: {
          id: true, sourceType: true, lineTotal: true,
          labOrderItem: { select: { status: true, result: { select: { status: true } } } },
          radiologyOrderItem: { select: { status: true } },
        } } } },
        invoice: {
          select: {
            status: true, subtotal: true, discountTotal: true, total: true,
            payments: { where: { status: "COMPLETED" }, select: { id: true, method: true } },
            items: { select: { id: true, lineTotal: true } },
            encounter: { select: { appointment: { select: { status: true } } } },
            refunds: { where: { status: { in: ["PENDING", "APPROVED", "COMPLETED"] } }, select: { id: true, amount: true, status: true, items: { select: { invoiceItemId: true, amount: true } } } },
          },
        },
      },
    });
    if (!refund) fail("BILLING_REFUND_NOT_FOUND", "The refund was not found.", 404);
    const payment = refund.invoice.payments[0];
    if (refund.invoice.payments.length !== 1 || !payment) {
      fail("BILLING_ORIGINAL_PAYMENT_AMBIGUOUS", "A single completed original payment is required to complete this refund.");
    }
    validateApprovedRefundSnapshot({
      refundId: refund.id,
      refundAmount: refund.amount,
      refundItems: refund.items,
      invoiceStatus: refund.invoice.status,
      invoiceSubtotal: refund.invoice.subtotal,
      invoiceDiscountTotal: refund.invoice.discountTotal,
      invoiceItems: refund.invoice.items,
      appointmentStatus: refund.invoice.encounter?.appointment?.status ?? null,
      hasCompletedPayment: true,
      reservedRefunds: refund.invoice.refunds,
    });
    const reserved = refund.invoice.refunds
      .filter((item) => item.id !== refund.id && item.status !== "PENDING")
      .reduce((sum, item) => sum + cents(item.amount), 0);
    if (!canCompleteRefund({
      status: refund.status,
      originalPaymentExists: true,
      refundAmountCents: cents(refund.amount),
      invoiceRemainingRefundableCents: cents(refund.invoice.total) - reserved,
    })) {
      fail("BILLING_REFUND_EXCEEDS_REMAINING_TOTAL", "Only an approved refund within the remaining invoice balance can be completed.");
    }
    if (payment.method !== "CASH" && !input.transactionReference?.trim()) {
      fail("BILLING_REFUND_REFERENCE_REQUIRED", "A refund transaction reference is required for the original POS card or e-wallet method.", 400);
    }
    const completedAt = new Date();
    const updated = await tx.refund.update({
      where: { id: refund.id },
      data: {
        status: "COMPLETED", completedAt, completedByEmployeeId: employeeId,
        paymentMethod: payment.method,
        transactionReference: payment.method === "CASH" ? null : input.transactionReference!.trim(),
      },
      select: { id: true, refundReference: true, amount: true, currencyCode: true, paymentMethod: true, completedAt: true },
    });
    const completedTotal = refund.invoice.refunds
      .filter((item) => item.status === "COMPLETED")
      .reduce((sum, item) => sum + cents(item.amount), cents(refund.amount));
    await tx.invoice.update({ where: { id: refund.invoiceId }, data: { status: completedTotal >= cents(refund.invoice.total) ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    await audit(tx, employeeId, "BILLING_REFUND_COMPLETED", "Refund", refund.id, `Refund completed using original payment method ${payment.method}.`);
    return { id: updated.id, reference: updated.refundReference, amount: money(updated.amount), currencyCode: updated.currencyCode, paymentMethod: updated.paymentMethod, completedAt: updated.completedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

function cairoDateTime(date: string, endExclusive = false): Date {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + (endExclusive ? 1 : 0), 0, 0, 0));
  let guess = target.getTime();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    guess += target.getTime() - represented;
  }
  return new Date(guess);
}

function cairoDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function getFinancialReport(query: BillingReportQuery) {
  const prisma = getPrismaClient();
  const from = cairoDateTime(query.from);
  const toExclusive = cairoDateTime(query.to, true);
  const [invoices, payments, refunds, outstandingInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { issuedAt: { gte: from, lt: toExclusive }, status: { not: "VOIDED" } },
      select: { id: true, status: true, subtotal: true, discountTotal: true, total: true, currencyCode: true },
    }),
    prisma.payment.findMany({
      where: { status: "COMPLETED", paidAt: { gte: from, lt: toExclusive } },
      select: { id: true, amount: true, currencyCode: true, method: true, paidAt: true },
    }),
    prisma.refund.findMany({
      where: { status: "COMPLETED", completedAt: { gte: from, lt: toExclusive } },
      select: { id: true, amount: true, currencyCode: true, completedAt: true },
    }),
    prisma.invoice.findMany({ where: { status: "ISSUED" }, select: { total: true, currencyCode: true } }),
  ]);
  const currencies = new Set([
    ...invoices.map((item) => item.currencyCode),
    ...payments.map((item) => item.currencyCode),
    ...refunds.map((item) => item.currencyCode),
    ...outstandingInvoices.map((item) => item.currencyCode),
  ]);
  if (currencies.size > 1) fail("BILLING_REPORT_CURRENCY_MISMATCH", "The selected period contains multiple currencies and cannot be combined into one total.");
  const currencyCode = [...currencies][0] ?? "EGP";
  const collectedCents = payments.reduce((sum, item) => sum + cents(item.amount), 0);
  const refundedCents = refunds.reduce((sum, item) => sum + cents(item.amount), 0);
  const byMethod = new Map<string, { count: number; amountCents: number }>();
  const daily = new Map<string, { collectedCents: number; refundedCents: number; paymentCount: number; refundCount: number }>();
  for (const payment of payments) {
    const method = byMethod.get(payment.method) ?? { count: 0, amountCents: 0 };
    method.count += 1; method.amountCents += cents(payment.amount); byMethod.set(payment.method, method);
    const day = cairoDay(payment.paidAt); const row = daily.get(day) ?? { collectedCents: 0, refundedCents: 0, paymentCount: 0, refundCount: 0 };
    row.collectedCents += cents(payment.amount); row.paymentCount += 1; daily.set(day, row);
  }
  for (const refund of refunds) {
    if (!refund.completedAt) continue;
    const day = cairoDay(refund.completedAt); const row = daily.get(day) ?? { collectedCents: 0, refundedCents: 0, paymentCount: 0, refundCount: 0 };
    row.refundedCents += cents(refund.amount); row.refundCount += 1; daily.set(day, row);
  }
  const invoiceGrossCents = invoices.reduce((sum, item) => sum + cents(item.subtotal), 0);
  // The discount belongs to the invoice's issuance period, not the approval's
  // decision timestamp. Sum the final approved total stored on each invoice.
  const discountCents = invoices.reduce((sum, item) => sum + cents(item.discountTotal), 0);
  const discountApprovalCount = invoices.length === 0 ? 0 : await prisma.discountApproval.count({
    where: { invoiceId: { in: invoices.map((item) => item.id) }, status: "APPROVED" },
  });
  return {
    period: { from: query.from, to: query.to, timeZone: "Africa/Cairo" },
    currencyCode,
    summary: {
      invoiceCount: invoices.length,
      paidInvoiceCount: invoices.filter((item) => item.status === "PAID" || item.status === "PARTIALLY_REFUNDED" || item.status === "REFUNDED").length,
      issuedUnpaidInvoiceCount: invoices.filter((item) => item.status === "ISSUED").length,
      invoiceGross: money(new Prisma.Decimal(invoiceGrossCents).div(100)),
      approvedDiscounts: money(new Prisma.Decimal(discountCents).div(100)),
      billedNet: money(new Prisma.Decimal(invoiceGrossCents - discountCents).div(100)),
      collected: money(new Prisma.Decimal(collectedCents).div(100)),
      refunded: money(new Prisma.Decimal(refundedCents).div(100)),
      netCollected: money(new Prisma.Decimal(reportNetCollectedCents(collectedCents, refundedCents)).div(100)),
      outstandingIssued: money(outstandingInvoices.reduce((sum, item) => sum + cents(item.total), 0) / 100),
      paymentCount: payments.length,
      refundCount: refunds.length,
      discountApprovalCount,
    },
    byPaymentMethod: [...byMethod.entries()].map(([method, value]) => ({ method, count: value.count, amount: money(new Prisma.Decimal(value.amountCents).div(100)) })),
    daily: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({
      date, collected: money(new Prisma.Decimal(value.collectedCents).div(100)), refunded: money(new Prisma.Decimal(value.refundedCents).div(100)),
      netCollected: money(new Prisma.Decimal(reportNetCollectedCents(value.collectedCents, value.refundedCents)).div(100)),
      paymentCount: value.paymentCount, refundCount: value.refundCount,
    })),
  };
}

export async function getExternalIntakeBillingCandidates(query: ExternalIntakeCandidateQuery) {
  const prisma = getPrismaClient();
  const intakes = await prisma.externalLabIntake.findMany({
    where: {
      OR: [
        { invoice: null },
        { invoice: { is: { status: "DRAFT" } } },
      ],
      labOrder: { isNot: null },
      ...(query.q ? { patient: { OR: [
        { mrn: { contains: query.q, mode: "insensitive" } },
        { firstName: { contains: query.q, mode: "insensitive" } },
        { lastName: { contains: query.q, mode: "insensitive" } },
      ] } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true, intakeReference: true, createdAt: true,
      invoice: { select: { status: true } },
      patient: { select: { mrn: true, firstName: true, lastName: true } },
      labOrder: { select: { items: { select: { id: true, status: true, result: { select: { status: true, releasedAt: true } }, labTest: { select: { name: true } } } } } },
    },
  });
  return {
    items: intakes.map((intake) => ({
      id: intake.id, reference: intake.intakeReference, createdAt: intake.createdAt.toISOString(),
      hasDraftInvoice: intake.invoice?.status === "DRAFT",
      patient: { mrn: intake.patient.mrn, displayName: `${intake.patient.firstName} ${intake.patient.lastName}` },
      releasedItemCount: intake.labOrder?.items.filter((item) => item.status === "RESULTED" && item.result?.status === "RELEASED").length ?? 0,
      pendingItemCount: intake.labOrder?.items.filter((item) =>
        (item.status !== "RESULTED" && item.status !== "CANCELLED")
        || (item.status === "RESULTED" && item.result?.status !== "RELEASED"),
      ).length ?? 0,
    })),
    limit: 100,
  };
}

export async function createOrRefreshExternalIntakeInvoiceDraft(externalLabIntakeId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireActiveRole(tx, employeeId, "CASHIER");
    const intakeRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "ExternalLabIntake" WHERE "id" = ${externalLabIntakeId} FOR UPDATE
    `;
    if (intakeRows.length !== 1) fail("BILLING_EXTERNAL_INTAKE_NOT_FOUND", "The external diagnostic intake was not found.", 404);
    const intake = await tx.externalLabIntake.findUnique({
      where: { id: externalLabIntakeId },
      select: {
        id: true, patientId: true,
        labOrder: { select: { items: { select: {
          id: true, status: true, priceSnapshot: true, currencyCode: true, processedAt: true, updatedAt: true,
          labTest: { select: { name: true } }, result: { select: { status: true, releasedAt: true } },
        } } } },
      },
    });
    if (!intake?.labOrder) fail("BILLING_EXTERNAL_INTAKE_NOT_READY", "The intake has no in-clinic laboratory order.");
    const billableItems = intake.labOrder.items.filter((item) => item.status === "RESULTED" && item.result?.status === "RELEASED");
    if (billableItems.length === 0) fail("BILLING_NO_COMPLETED_SERVICES", "No released in-clinic diagnostic services are available to invoice yet.");
    const currencies = new Set(billableItems.map((item) => item.currencyCode));
    if (currencies.size !== 1) fail("BILLING_CURRENCY_MISMATCH", "All items on an invoice must use the same currency.");
    const currencyCode = [...currencies][0];
    if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) fail("BILLING_INVALID_CURRENCY", "The invoice currency is not configured correctly.");

    let invoice = await tx.invoice.findUnique({
      where: { externalLabIntakeId },
      select: { id: true, status: true, discountTotal: true, items: { select: { labOrderItemId: true } } },
    });
    if (invoice && invoice.status !== "DRAFT") fail("BILLING_INVOICE_ALREADY_ISSUED", "An issued invoice cannot be refreshed.");
    const createdNewInvoice = invoice === null;
    if (!invoice) {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: reference("MER-INV"), patientId: intake.patientId, encounterId: null, externalLabIntakeId,
          status: "DRAFT", subtotal: new Prisma.Decimal(0), discountTotal: new Prisma.Decimal(0), total: new Prisma.Decimal(0),
          currencyCode, createdByEmployeeId: employeeId,
        }, select: { id: true },
      });
      invoice = { id: created.id, status: "DRAFT", discountTotal: new Prisma.Decimal(0), items: [] };
    }
    const includedIds = new Set(invoice.items.map((item) => item.labOrderItemId).filter((id): id is string => id !== null));
    const newItems = billableItems.filter((item) => !includedIds.has(item.id));
    for (const item of newItems) {
      if (item.currencyCode !== currencyCode) fail("BILLING_CURRENCY_MISMATCH", "All items on an invoice must use the same currency.");
      if (!item.priceSnapshot.isFinite() || item.priceSnapshot.lessThanOrEqualTo(0)) fail("BILLING_INVALID_SERVICE_PRICE", `A valid price is missing for ${item.labTest.name}.`);
      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id, sourceType: "LAB_TEST", description: item.labTest.name, quantity: 1,
          unitPrice: item.priceSnapshot, discountAmount: new Prisma.Decimal(0), lineTotal: item.priceSnapshot,
          currencyCode: item.currencyCode, labOrderItemId: item.id,
          serviceCompletedAt: item.result?.releasedAt ?? item.processedAt ?? item.updatedAt,
        },
      });
    }
    const aggregate = await tx.invoiceItem.aggregate({ where: { invoiceId: invoice.id }, _sum: { lineTotal: true } });
    const subtotal = aggregate._sum.lineTotal ?? new Prisma.Decimal(0);
    const total = subtotal.minus(invoice.discountTotal).toDecimalPlaces(2);
    await tx.invoice.update({ where: { id: invoice.id }, data: { subtotal, total } });
    await audit(tx, employeeId, createdNewInvoice ? "BILLING_EXTERNAL_INTAKE_INVOICE_CREATED" : "BILLING_EXTERNAL_INTAKE_INVOICE_REFRESHED", "Invoice", invoice.id, `Invoice contains ${billableItems.length} released in-clinic diagnostic item(s).`);
    return tx.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      select: { id: true, invoiceNumber: true, status: true, subtotal: true, discountTotal: true, total: true, currencyCode: true, externalLabIntakeId: true },
    }).then((value) => ({ ...value, subtotal: money(value.subtotal), discountTotal: money(value.discountTotal), total: money(value.total) }));
  }, { isolationLevel: "Serializable" });
}

export async function issueExternalIntakeInvoice(invoiceId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireActiveRole(tx, employeeId, "CASHIER");
    await lockInvoice(tx, invoiceId);
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true, externalLabIntakeId: true, status: true, subtotal: true, discountTotal: true,
        items: { select: { id: true, lineTotal: true, labOrderItemId: true } },
      },
    });
    if (!invoice?.externalLabIntakeId) fail("BILLING_EXTERNAL_INTAKE_INVOICE_NOT_FOUND", "The external intake invoice was not found.", 404);
    if (invoice.status !== "DRAFT") fail("BILLING_INVOICE_NOT_DRAFT", "Only a draft invoice can be issued.");
    const intake = await tx.externalLabIntake.findUnique({
      where: { id: invoice.externalLabIntakeId },
      select: { labOrder: { select: { items: { select: { id: true, status: true, result: { select: { status: true } } } } } } },
    });
    if (!intake?.labOrder) fail("BILLING_EXTERNAL_INTAKE_NOT_READY", "The in-clinic diagnostic order is not available.");
    const pending = intake.labOrder.items.some((item) => (item.status !== "RESULTED" && item.status !== "CANCELLED") || (item.status === "RESULTED" && item.result?.status !== "RELEASED"));
    const releasedIds = new Set(intake.labOrder.items.filter((item) => item.status === "RESULTED" && item.result?.status === "RELEASED").map((item) => item.id));
    if (pending) fail("BILLING_SERVICES_PENDING", "The invoice cannot be issued while an in-clinic diagnostic service is pending.");
    if (invoice.items.length === 0 || invoice.items.some((item) => !item.labOrderItemId || !releasedIds.has(item.labOrderItemId)) || [...releasedIds].some((id) => !invoice.items.some((item) => item.labOrderItemId === id))) {
      fail("BILLING_INVOICE_REFRESH_REQUIRED", "Refresh the invoice to include all released diagnostic services before issuing it.");
    }
    const subtotal = invoice.items.reduce((sum, item) => sum.plus(item.lineTotal), new Prisma.Decimal(0));
    const total = subtotal.minus(invoice.discountTotal).toDecimalPlaces(2);
    if (total.lessThanOrEqualTo(0)) fail("BILLING_INVOICE_TOTAL_INVALID", "The invoice total must be greater than zero.");
    const issuedAt = new Date();
    await tx.invoice.update({ where: { id: invoice.id }, data: { subtotal, total, status: "ISSUED", issuedAt } });
    await audit(tx, employeeId, "BILLING_INVOICE_ISSUED", "Invoice", invoice.id, "External diagnostic intake invoice issued after all in-clinic items were released or cancelled.");
    return { id: invoice.id, status: "ISSUED", total: money(total), issuedAt: issuedAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function createBillingInvoiceDraft(input: { encounterId: string; walkInDoctorServiceId?: string | null } | { externalLabIntakeId: string }, employeeId: string) {
  if ("externalLabIntakeId" in input) return createOrRefreshExternalIntakeInvoiceDraft(input.externalLabIntakeId, employeeId);
  // Walk-in pricing is snapshotted into InvoiceItem at draft creation. It never
  // reads a current service price again after the line has been created.
  return createOrRefreshInvoiceDraft(input.encounterId, employeeId, input.walkInDoctorServiceId ?? undefined);
}

export async function issueBillingInvoice(invoiceId: string, employeeId: string) {
  const prisma = getPrismaClient();
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { encounterId: true, externalLabIntakeId: true } });
  if (!invoice) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);
  if (invoice.externalLabIntakeId) return issueExternalIntakeInvoice(invoiceId, employeeId);
  if (!invoice.encounterId) fail("BILLING_INVOICE_SOURCE_INVALID", "The invoice has no supported billing source.");
  return issueInvoice(invoiceId, employeeId);
}

export { BillingWorkflowError };
