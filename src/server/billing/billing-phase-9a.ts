import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import {
  canCollectFullPayment,
  canCreateInvoiceDraft,
  canIssueInvoice,
} from "./billing-phase-9a-policy";
import type {
  CollectFullPaymentRequest,
  InvoiceWorklistQuery,
  InvoiceCandidateQuery,
} from "./billing-phase-9a-validation";

export class BillingWorkflowError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "BillingWorkflowError";
    this.code = code;
    this.status = status;
  }
}

type Tx = Prisma.TransactionClient;
type Decimal = Prisma.Decimal;

function fail(code: string, message: string, status = 409): never {
  throw new BillingWorkflowError(code, message, status);
}

function invoiceReference(): string {
  const date = new Date();
  const y = date.getUTCFullYear().toString();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `MER-INV-${y}${m}${d}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function money(value: Decimal | number | string): string {
  return new Prisma.Decimal(value).toFixed(2);
}

function cents(value: Decimal | number | string): number {
  const decimal = new Prisma.Decimal(value).toDecimalPlaces(2);
  return Number(decimal.mul(100).toFixed(0));
}

async function lockEncounter(tx: Tx, encounterId: string): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE
  `;
  if (rows.length !== 1) fail("BILLING_ENCOUNTER_NOT_FOUND", "The encounter was not found.", 404);
}

async function lockInvoice(tx: Tx, invoiceId: string): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Invoice" WHERE "id" = ${invoiceId} FOR UPDATE
  `;
  if (rows.length !== 1) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);
}

async function requireActiveCashier(tx: Tx, employeeId: string): Promise<void> {
  const employee = await tx.employee.findUnique({
    where: { id: employeeId },
    select: {
      status: true,
      roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } },
    },
  });
  if (!employee || employee.status !== "ACTIVE" || !employee.roleAssignments.some((item) => item.role === "CASHIER")) {
    fail("BILLING_CASHIER_REQUIRED", "An active Cashier role is required for this billing action.", 403);
  }
}

async function audit(
  tx: Tx,
  employeeId: string,
  action: string,
  entityType: string,
  entityId: string,
  reason?: string,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorType: "EMPLOYEE",
      actorEmployeeId: employeeId,
      action,
      entityType,
      entityId,
      reason: reason ?? null,
    },
  });
}

const invoiceDetailInclude = {
  patient: { select: { id: true, mrn: true, firstName: true, lastName: true } },
  encounter: { select: { appointment: { select: { status: true } } } },
  items: {
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
    select: {
      id: true,
      sourceType: true,
      description: true,
      quantity: true,
      unitPrice: true,
      discountAmount: true,
      lineTotal: true,
      currencyCode: true,
      serviceCompletedAt: true,
      createdAt: true,
      labOrderItem: { select: { status: true, result: { select: { status: true } } } },
      radiologyOrderItem: { select: { status: true } },
    },
  },
  payments: {
    where: { status: "COMPLETED" as const },
    orderBy: [{ paidAt: "desc" as const }, { id: "desc" as const }],
    select: {
      id: true,
      amount: true,
      currencyCode: true,
      method: true,
      transactionReference: true,
      paidAt: true,
    },
  },
  refunds: {
    where: { status: { in: ["PENDING", "APPROVED", "COMPLETED"] as const } },
    select: { items: { select: { invoiceItemId: true } } },
  },
} satisfies Prisma.InvoiceInclude;

type InvoiceWithDetail = Prisma.InvoiceGetPayload<{ include: typeof invoiceDetailInclude }>;

function serializeInvoice(invoice: InvoiceWithDetail) {
  const reservedItemIds = new Set(invoice.refunds.flatMap((refund) => refund.items.map((item) => item.invoiceItemId)));
  const paid = invoice.payments.length > 0
    && (invoice.status === "PAID" || invoice.status === "PARTIALLY_REFUNDED");
  const itemGrossCents = invoice.items.map((item) => ({ id: item.id, grossCents: cents(item.lineTotal) }));
  const subtotalCents = cents(invoice.subtotal);
  const discountCents = cents(invoice.discountTotal);
  let allocatedDiscount = 0;
  const netCentsByItem = new Map<string, number>();
  const ordered = [...itemGrossCents].sort((a, b) => a.id.localeCompare(b.id));
  ordered.forEach((item, index) => {
    const itemDiscount = index === ordered.length - 1
      ? discountCents - allocatedDiscount
      : subtotalCents > 0 ? Math.floor((discountCents * item.grossCents) / subtotalCents) : 0;
    allocatedDiscount += itemDiscount;
    netCentsByItem.set(item.id, Math.max(0, item.grossCents - itemDiscount));
  });
  return {
    id: invoice.id,
    encounterId: invoice.encounterId,
    externalLabIntakeId: invoice.externalLabIntakeId,
    invoiceNumber: invoice.invoiceNumber,
    patient: {
      id: invoice.patient.id,
      mrn: invoice.patient.mrn,
      displayName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
    },
    status: invoice.status,
    subtotal: money(invoice.subtotal),
    discountTotal: money(invoice.discountTotal),
    total: money(invoice.total),
    currencyCode: invoice.currencyCode,
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    items: invoice.items.map((item) => {
      const unprovided = (item.sourceType === "SERVICE" && invoice.encounter?.appointment?.status === "CANCELLED")
        || (item.sourceType === "LAB_TEST" && (item.labOrderItem?.status === "CANCELLED" || item.labOrderItem?.result?.status === "CANCELLED"))
        || (item.sourceType === "RADIOLOGY_PROCEDURE" && item.radiologyOrderItem?.status === "CANCELLED");
      const refundableCents = paid && unprovided && !reservedItemIds.has(item.id) ? (netCentsByItem.get(item.id) ?? 0) : 0;
      return {
        id: item.id,
        sourceType: item.sourceType,
        description: item.description,
        quantity: item.quantity,
        unitPrice: money(item.unitPrice),
        discountAmount: money(item.discountAmount),
        lineTotal: money(item.lineTotal),
        currencyCode: item.currencyCode,
        serviceCompletedAt: item.serviceCompletedAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        refundableAmount: money(new Prisma.Decimal(refundableCents).div(100)),
      };
    }),
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      amount: money(payment.amount),
      currencyCode: payment.currencyCode,
      method: payment.method,
      transactionReference: payment.transactionReference,
      paidAt: payment.paidAt.toISOString(),
    })),
  };
}

async function getInvoiceDetailTx(tx: Tx, invoiceId: string) {
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: invoiceDetailInclude });
  if (!invoice) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);
  return serializeInvoice(invoice);
}

type BillableItem = {
  sourceType: "SERVICE" | "LAB_TEST" | "RADIOLOGY_PROCEDURE";
  description: string;
  quantity: 1;
  unitPrice: Decimal;
  lineTotal: Decimal;
  currencyCode: string;
  serviceCatalogId?: string;
  labOrderItemId?: string;
  radiologyOrderItemId?: string;
  serviceCompletedAt: Date;
};

function assertPositivePrice(value: Decimal, description: string): void {
  if (!value.isFinite() || value.lessThanOrEqualTo(0)) {
    fail("BILLING_INVALID_SERVICE_PRICE", `A valid positive price is missing for ${description}.`, 409);
  }
}

async function readCompletedEncounter(tx: Tx, encounterId: string) {
  const encounter = await tx.encounter.findUnique({
    where: { id: encounterId },
    select: {
      id: true,
      patientId: true,
      status: true,
      completedAt: true,
      doctor: {
        select: {
          services: {
            where: { isActive: true, service: { isActive: true, type: "CONSULTATION" } },
            select: { id: true, serviceId: true, price: true, currencyCode: true, service: { select: { name: true } } },
          },
        },
      },
      queueEntry: { select: { type: true } },
      appointment: {
        select: {
          id: true,
          patientId: true,
          status: true,
          bookedPrice: true,
          currencyCode: true,
          completedAt: true,
          doctorService: {
            select: {
              serviceId: true,
              service: { select: { name: true } },
            },
          },
        },
      },
      labOrders: {
        where: { externalIntakeId: null },
        select: {
          items: {
            select: {
              id: true,
              status: true,
              priceSnapshot: true,
              currencyCode: true,
              processedAt: true,
              updatedAt: true,
              labTest: { select: { name: true } },
              result: { select: { status: true, releasedAt: true } },
            },
          },
        },
      },
      radiologyOrders: {
        select: {
          items: {
            select: {
              id: true,
              status: true,
              priceSnapshot: true,
              currencyCode: true,
              updatedAt: true,
              procedure: { select: { name: true } },
              exam: { select: { performedAt: true } },
            },
          },
        },
      },
    },
  });

  if (!encounter) fail("BILLING_ENCOUNTER_NOT_FOUND", "The encounter was not found.", 404);
  if (!canCreateInvoiceDraft(encounter.status) || !encounter.completedAt) {
    fail("BILLING_ENCOUNTER_NOT_COMPLETED", "An invoice can only be prepared after the encounter is completed.", 409);
  }
  if (encounter.appointment?.patientId && encounter.appointment.patientId !== encounter.patientId) {
    fail("BILLING_APPOINTMENT_PATIENT_MISMATCH", "The appointment and encounter patient do not match.", 409);
  }
  return encounter;
}

function hasPendingEncounterServices(encounter: Awaited<ReturnType<typeof readCompletedEncounter>>): boolean {
  if (encounter.appointment && !["COMPLETED", "CANCELLED"].includes(encounter.appointment.status)) return true;
  for (const order of encounter.labOrders) {
    for (const item of order.items) {
      if (item.status !== "RESULTED" && item.status !== "CANCELLED") return true;
      if (item.status === "RESULTED" && item.result?.status !== "RELEASED") return true;
    }
  }
  for (const order of encounter.radiologyOrders) {
    for (const item of order.items) {
      if (item.status !== "COMPLETED" && item.status !== "CANCELLED") return true;
    }
  }
  return false;
}

function collectBillableItems(
  encounter: Awaited<ReturnType<typeof readCompletedEncounter>>,
  walkInDoctorServiceId?: string,
): BillableItem[] {
  const items: BillableItem[] = [];

  if (encounter.appointment?.status === "COMPLETED") {
    const appointment = encounter.appointment;
    const description = appointment.doctorService.service.name;
    assertPositivePrice(appointment.bookedPrice, description);
    items.push({
      sourceType: "SERVICE",
      description,
      quantity: 1,
      unitPrice: appointment.bookedPrice,
      lineTotal: appointment.bookedPrice,
      currencyCode: appointment.currencyCode,
      serviceCatalogId: appointment.doctorService.serviceId,
      serviceCompletedAt: appointment.completedAt ?? encounter.completedAt!,
    });
  } else if (!encounter.appointment && encounter.queueEntry?.type === "WALK_IN" && walkInDoctorServiceId) {
    const doctorService = encounter.doctor.services.find((item) => item.id === walkInDoctorServiceId);
    if (!doctorService) {
      fail("BILLING_WALK_IN_SERVICE_INVALID", "Choose an active consultation service assigned to this walk-in doctor.", 400);
    }
    assertPositivePrice(doctorService.price, doctorService.service.name);
    items.push({
      sourceType: "SERVICE",
      description: doctorService.service.name,
      quantity: 1,
      unitPrice: doctorService.price,
      lineTotal: doctorService.price,
      currencyCode: doctorService.currencyCode,
      serviceCatalogId: doctorService.serviceId,
      serviceCompletedAt: encounter.completedAt!,
    });
  }

  for (const order of encounter.labOrders) {
    for (const item of order.items) {
      if (item.status !== "RESULTED" || item.result?.status !== "RELEASED") continue;
      const description = item.labTest.name;
      assertPositivePrice(item.priceSnapshot, description);
      items.push({
        sourceType: "LAB_TEST",
        description,
        quantity: 1,
        unitPrice: item.priceSnapshot,
        lineTotal: item.priceSnapshot,
        currencyCode: item.currencyCode,
        labOrderItemId: item.id,
        serviceCompletedAt: item.result.releasedAt ?? item.processedAt ?? item.updatedAt,
      });
    }
  }

  for (const order of encounter.radiologyOrders) {
    for (const item of order.items) {
      if (item.status !== "COMPLETED") continue;
      const description = item.procedure.name;
      assertPositivePrice(item.priceSnapshot, description);
      items.push({
        sourceType: "RADIOLOGY_PROCEDURE",
        description,
        quantity: 1,
        unitPrice: item.priceSnapshot,
        lineTotal: item.priceSnapshot,
        currencyCode: item.currencyCode,
        radiologyOrderItemId: item.id,
        serviceCompletedAt: item.exam?.performedAt ?? item.updatedAt,
      });
    }
  }

  return items;
}

function assertSingleCurrency(items: BillableItem[]): string {
  const currencies = new Set(items.map((item) => item.currencyCode));
  if (currencies.size !== 1) {
    fail("BILLING_CURRENCY_MISMATCH", "All items on an invoice must use the same currency.", 409);
  }
  const [currencyCode] = [...currencies];
  if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) {
    fail("BILLING_INVALID_CURRENCY", "The invoice currency is not configured correctly.", 409);
  }
  return currencyCode;
}

function isAlreadyOnInvoice(existingItems: Array<{
  sourceType: string;
  serviceCatalogId: string | null;
  labOrderItemId: string | null;
  radiologyOrderItemId: string | null;
}>, candidate: BillableItem): boolean {
  if (candidate.sourceType === "SERVICE") {
    return existingItems.some((item) => item.sourceType === "SERVICE" && item.serviceCatalogId === candidate.serviceCatalogId);
  }
  if (candidate.sourceType === "LAB_TEST") {
    return existingItems.some((item) => item.labOrderItemId === candidate.labOrderItemId);
  }
  return existingItems.some((item) => item.radiologyOrderItemId === candidate.radiologyOrderItemId);
}

export async function createOrRefreshInvoiceDraft(
  encounterId: string,
  employeeId: string,
  walkInDoctorServiceId?: string,
) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireActiveCashier(tx, employeeId);
    await lockEncounter(tx, encounterId);
    const encounter = await readCompletedEncounter(tx, encounterId);
    let candidates = collectBillableItems(encounter, walkInDoctorServiceId);

    let invoice = await tx.invoice.findUnique({
      where: { encounterId },
      select: {
        id: true,
        status: true,
        subtotal: true,
        discountTotal: true,
        items: {
          select: {
            sourceType: true,
            description: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            currencyCode: true,
            serviceCompletedAt: true,
            serviceCatalogId: true,
            labOrderItemId: true,
            radiologyOrderItemId: true,
          },
        },
      },
    });

    if (invoice && invoice.status !== "DRAFT") {
      fail("BILLING_INVOICE_ALREADY_ISSUED", "An issued invoice cannot be changed. Create no duplicate invoice for this encounter.", 409);
    }

    if (!encounter.appointment && encounter.queueEntry?.type === "WALK_IN") {
      const existingServiceItems = invoice?.items.filter((item) => item.sourceType === "SERVICE" && item.serviceCatalogId !== null) ?? [];
      if (existingServiceItems.length > 1) {
        fail("BILLING_WALK_IN_SERVICE_AMBIGUOUS", "A walk-in invoice must contain exactly one consultation service snapshot.");
      }
      if (walkInDoctorServiceId && existingServiceItems.length === 1) {
        const selectedService = encounter.doctor.services.find((item) => item.id === walkInDoctorServiceId);
        if (!selectedService || selectedService.serviceId !== existingServiceItems[0].serviceCatalogId) {
          fail("BILLING_WALK_IN_SERVICE_SNAPSHOT_LOCKED", "The consultation service snapshot cannot be changed after the draft is created.");
        }
      }
      if (!walkInDoctorServiceId) {
        const snapshot = existingServiceItems[0];
        if (!snapshot || !invoice) {
          fail("BILLING_WALK_IN_SERVICE_REQUIRED", "Choose the consultation service for this walk-in before creating its invoice.", 400);
        }
        candidates = [
          ...candidates,
          {
            sourceType: "SERVICE",
            description: snapshot.description,
            quantity: 1,
            unitPrice: snapshot.unitPrice,
            lineTotal: snapshot.lineTotal,
            currencyCode: snapshot.currencyCode,
            serviceCatalogId: snapshot.serviceCatalogId ?? undefined,
            serviceCompletedAt: snapshot.serviceCompletedAt,
          },
        ];
      }
    }

    const createdNewInvoice = invoice === null;
    const newItems = candidates.filter((candidate) => !invoice || !isAlreadyOnInvoice(invoice.items, candidate));
    if (!invoice && candidates.length === 0) {
      fail("BILLING_NO_COMPLETED_SERVICES", "No completed, billable services are available for this encounter yet.", 409);
    }
    if (invoice && newItems.length === 0 && invoice.items.length === 0) {
      fail("BILLING_NO_COMPLETED_SERVICES", "No completed, billable services are available for this encounter yet.", 409);
    }

    const currencyCode = newItems.length > 0
      ? assertSingleCurrency(newItems)
      : (await tx.invoice.findUniqueOrThrow({ where: { id: invoice!.id }, select: { currencyCode: true } })).currencyCode;

    if (invoice) {
      const existingInvoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        select: { currencyCode: true },
      });
      if (newItems.some((item) => item.currencyCode !== existingInvoice.currencyCode)) {
        fail("BILLING_CURRENCY_MISMATCH", "A draft invoice cannot combine different currencies.", 409);
      }
    }

    if (!invoice) {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: invoiceReference(),
          patientId: encounter.patientId,
          encounterId: encounter.id,
          status: "DRAFT",
          subtotal: new Prisma.Decimal(0),
          discountTotal: new Prisma.Decimal(0),
          total: new Prisma.Decimal(0),
          currencyCode,
          createdByEmployeeId: employeeId,
        },
        select: { id: true },
      });
      invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: created.id },
        select: {
          id: true,
          status: true,
          subtotal: true,
          discountTotal: true,
          items: {
            select: {
              sourceType: true,
              description: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true,
              currencyCode: true,
              serviceCompletedAt: true,
              serviceCatalogId: true,
              labOrderItemId: true,
              radiologyOrderItemId: true,
            },
          },
        },
      });
    }

    for (const item of newItems) {
      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          sourceType: item.sourceType,
          description: item.description,
          quantity: 1,
          unitPrice: item.unitPrice,
          discountAmount: new Prisma.Decimal(0),
          lineTotal: item.lineTotal,
          currencyCode: item.currencyCode,
          serviceCatalogId: item.serviceCatalogId ?? null,
          labOrderItemId: item.labOrderItemId ?? null,
          radiologyOrderItemId: item.radiologyOrderItemId ?? null,
          serviceCompletedAt: item.serviceCompletedAt,
        },
      });
    }

    const aggregate = await tx.invoiceItem.aggregate({
      where: { invoiceId: invoice.id },
      _sum: { lineTotal: true },
      _count: { _all: true },
    });
    const subtotal = aggregate._sum.lineTotal ?? new Prisma.Decimal(0);
    const discountTotal = invoice.discountTotal;
    if (discountTotal.greaterThan(subtotal)) {
      fail("BILLING_DISCOUNT_EXCEEDS_SUBTOTAL", "The invoice discount exceeds its item subtotal.", 409);
    }
    const total = subtotal.minus(discountTotal).toDecimalPlaces(2);
    await tx.invoice.update({ where: { id: invoice.id }, data: { subtotal, total } });

    if (createdNewInvoice || newItems.length > 0) {
      await audit(
        tx,
        employeeId,
        createdNewInvoice ? "BILLING_INVOICE_DRAFT_CREATED" : "BILLING_INVOICE_DRAFT_REFRESHED",
        "Invoice",
        invoice.id,
        `Draft contains ${aggregate._count._all} completed service item(s).`,
      );
    }
    return getInvoiceDetailTx(tx, invoice.id);
  }, { isolationLevel: "Serializable" });
}

export async function issueInvoice(invoiceId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireActiveCashier(tx, employeeId);
    const invoiceLocator = await tx.invoice.findUnique({ where: { id: invoiceId }, select: { encounterId: true } });
    if (!invoiceLocator) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);
    if (!invoiceLocator.encounterId) fail("BILLING_INVOICE_SOURCE_INVALID", "This invoice is not linked to a completed Encounter.", 409);
    await lockEncounter(tx, invoiceLocator.encounterId);
    await lockInvoice(tx, invoiceId);
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        subtotal: true,
        discountTotal: true,
        encounterId: true,
        items: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            currencyCode: true,
            serviceCompletedAt: true,
            sourceType: true,
            serviceCatalogId: true,
            labOrderItemId: true,
            radiologyOrderItemId: true,
          },
        },
      },
    });
    if (!invoice) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);

    const encounterId = invoice.encounterId;
    if (!encounterId) fail("BILLING_INVOICE_SOURCE_INVALID", "This invoice is not linked to a completed Encounter.", 409);
    const encounter = await readCompletedEncounter(tx, encounterId);
    const pendingServices = hasPendingEncounterServices(encounter);
    const currentBillableItems = collectBillableItems(encounter);
    if (!encounter.appointment && encounter.queueEntry?.type === "WALK_IN") {
      const walkInSnapshot = invoice.items.filter((item) => item.sourceType === "SERVICE" && item.serviceCatalogId !== null);
      if (walkInSnapshot.length > 1) fail("BILLING_WALK_IN_SERVICE_AMBIGUOUS", "A walk-in invoice must contain exactly one consultation service snapshot.");
      if (walkInSnapshot.length === 1) {
        const item = walkInSnapshot[0];
        currentBillableItems.push({
          sourceType: "SERVICE",
          description: item.description,
          quantity: 1,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          currencyCode: item.currencyCode,
          serviceCatalogId: item.serviceCatalogId ?? undefined,
          serviceCompletedAt: item.serviceCompletedAt,
        });
      }
    }
    const allCompletedItemsIncluded = currentBillableItems.every((candidate) => isAlreadyOnInvoice(invoice.items, candidate));
    const allDraftItemsStillValid = invoice.items.every((existingItem) =>
      currentBillableItems.some((candidate) => isAlreadyOnInvoice([existingItem], candidate)),
    );
    if (!allCompletedItemsIncluded) {
      fail("BILLING_INVOICE_REFRESH_REQUIRED", "Newly completed services must be added to the draft before it can be issued.", 409);
    }
    if (!allDraftItemsStillValid) {
      fail("BILLING_INVOICE_ITEMS_CHANGED", "A draft service is no longer in a billable completed state. Review the encounter before issuing this invoice.", 409);
    }
    const subtotal = invoice.items.reduce((sum, item) => sum.plus(item.lineTotal), new Prisma.Decimal(0));
    const total = subtotal.minus(invoice.discountTotal).toDecimalPlaces(2);
    const decision = canIssueInvoice({
      invoiceStatus: invoice.status,
      itemCount: invoice.items.length,
      hasPendingServices: pendingServices,
      totalCents: cents(total),
    });
    if (!decision) {
      if (invoice.status !== "DRAFT") fail("BILLING_INVOICE_NOT_DRAFT", "Only a draft invoice can be issued.", 409);
      if (invoice.items.length === 0) fail("BILLING_INVOICE_EMPTY", "An invoice must contain at least one completed service item.", 409);
      if (pendingServices) fail("BILLING_SERVICES_PENDING", "The invoice cannot be issued while a related service is still pending.", 409);
      fail("BILLING_INVOICE_TOTAL_INVALID", "The invoice total must be greater than zero.", 409);
    }

    const issuedAt = new Date();
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { subtotal, total, status: "ISSUED", issuedAt },
    });
    await audit(tx, employeeId, "BILLING_INVOICE_ISSUED", "Invoice", invoice.id, "Invoice issued after all encounter services were completed or cancelled.");
    return getInvoiceDetailTx(tx, invoice.id);
  }, { isolationLevel: "Serializable" });
}

export async function collectFullInvoicePayment(
  invoiceId: string,
  employeeId: string,
  request: CollectFullPaymentRequest,
) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireActiveCashier(tx, employeeId);
    await lockInvoice(tx, invoiceId);
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        currencyCode: true,
        patient: { select: { mrn: true, firstName: true, lastName: true } },
        payments: { where: { status: "COMPLETED" }, select: { id: true, amount: true } },
      },
    });
    if (!invoice) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);

    const totalCents = cents(invoice.total);
    const paidCents = invoice.payments.reduce((sum, payment) => sum + cents(payment.amount), 0);
    const decision = canCollectFullPayment({
      invoiceStatus: invoice.status,
      hasCompletedPayment: invoice.payments.length > 0,
      totalCents,
      paidCents,
    });
    if (!decision) {
      if (invoice.status !== "ISSUED") fail("BILLING_INVOICE_NOT_ISSUED", "Payment can only be collected for an issued invoice.", 409);
      if (invoice.payments.length > 0) fail("BILLING_PAYMENT_ALREADY_COMPLETED", "This invoice already has a completed payment.", 409);
      fail("BILLING_INVOICE_TOTAL_INVALID", "A positive invoice total is required before collection.", 409);
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.total,
        currencyCode: invoice.currencyCode,
        method: request.method,
        transactionReference: request.transactionReference?.trim() || null,
        status: "COMPLETED",
        receivedByEmployeeId: employeeId,
        paidAt: new Date(),
      },
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        method: true,
        transactionReference: true,
        paidAt: true,
      },
    });

    await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });
    await audit(tx, employeeId, "BILLING_PAYMENT_COLLECTED", "Payment", payment.id, `Full invoice payment collected using ${request.method}.`);

    return {
      payment: {
        id: payment.id,
        amount: money(payment.amount),
        currencyCode: payment.currencyCode,
        method: payment.method,
        transactionReference: payment.transactionReference,
        paidAt: payment.paidAt.toISOString(),
      },
      receipt: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        patientMrn: invoice.patient.mrn,
        patientDisplayName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
        total: money(payment.amount),
        currencyCode: payment.currencyCode,
        paymentMethod: payment.method,
        paidAt: payment.paidAt.toISOString(),
      },
    };
  }, { isolationLevel: "Serializable" });
}

export async function getCashierInvoiceCandidates(query: InvoiceCandidateQuery) {
  const prisma = getPrismaClient();
  const encounters = await prisma.encounter.findMany({
    where: {
      status: "COMPLETED",
      invoices: { none: {} },
      ...(query.q ? {
        patient: {
          OR: [
            { mrn: { contains: query.q, mode: "insensitive" } },
            { firstName: { contains: query.q, mode: "insensitive" } },
            { lastName: { contains: query.q, mode: "insensitive" } },
          ],
        },
      } : {}),
    },
    orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      completedAt: true,
      patient: { select: { mrn: true, firstName: true, lastName: true } },
      queueEntry: { select: { type: true } },
      doctor: {
        select: {
          services: {
            where: { isActive: true, service: { isActive: true, type: "CONSULTATION" } },
            select: { id: true, serviceId: true, price: true, currencyCode: true, service: { select: { name: true } } },
          },
        },
      },
      appointment: {
        select: {
          bookingReference: true,
          startsAt: true,
          doctorService: { select: { service: { select: { name: true } } } },
        },
      },
    },
  });

  return {
    items: encounters.map((encounter) => ({
      encounterId: encounter.id,
      completedAt: encounter.completedAt?.toISOString() ?? null,
      patient: {
        mrn: encounter.patient.mrn,
        displayName: `${encounter.patient.firstName} ${encounter.patient.lastName}`,
      },
      appointment: encounter.appointment ? {
        bookingReference: encounter.appointment.bookingReference,
        startsAt: encounter.appointment.startsAt.toISOString(),
        serviceName: encounter.appointment.doctorService.service.name,
      } : null,
      isWalkIn: encounter.queueEntry?.type === "WALK_IN" && !encounter.appointment,
      walkInServices: !encounter.appointment && encounter.queueEntry?.type === "WALK_IN"
        ? encounter.doctor.services.map((service) => ({
          doctorServiceId: service.id,
          serviceId: service.serviceId,
          name: service.service.name,
          price: money(service.price),
          currencyCode: service.currencyCode,
        }))
        : [],
    })),
    limit: 100,
  };
}

export async function getCashierPaymentReceipt(paymentId: string) {
  const prisma = getPrismaClient();
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      currencyCode: true,
      method: true,
      transactionReference: true,
      status: true,
      paidAt: true,
      invoice: {
        select: {
          invoiceNumber: true,
          subtotal: true,
          discountTotal: true,
          total: true,
          currencyCode: true,
          patient: { select: { mrn: true, firstName: true, lastName: true } },
          items: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              description: true,
              quantity: true,
              unitPrice: true,
              discountAmount: true,
              lineTotal: true,
              currencyCode: true,
            },
          },
        },
      },
    },
  });

  if (!payment || payment.status !== "COMPLETED") {
    fail("BILLING_RECEIPT_NOT_FOUND", "A completed payment receipt was not found.", 404);
  }

  return {
    paymentId: payment.id,
    invoiceNumber: payment.invoice.invoiceNumber,
    patient: {
      mrn: payment.invoice.patient.mrn,
      displayName: `${payment.invoice.patient.firstName} ${payment.invoice.patient.lastName}`,
    },
    items: payment.invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      discountAmount: money(item.discountAmount),
      lineTotal: money(item.lineTotal),
      currencyCode: item.currencyCode,
    })),
    subtotal: money(payment.invoice.subtotal),
    discountTotal: money(payment.invoice.discountTotal),
    invoiceTotal: money(payment.invoice.total),
    amountPaid: money(payment.amount),
    currencyCode: payment.currencyCode,
    paymentMethod: payment.method,
    transactionReference: payment.transactionReference,
    paidAt: payment.paidAt.toISOString(),
  };
}

export async function getCashierInvoiceWorklist(query: InvoiceWorklistQuery) {
  const prisma = getPrismaClient();
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? {
        OR: [
          { invoiceNumber: { contains: query.q, mode: "insensitive" } },
          { patient: { mrn: { contains: query.q, mode: "insensitive" } } },
          { patient: { firstName: { contains: query.q, mode: "insensitive" } } },
          { patient: { lastName: { contains: query.q, mode: "insensitive" } } },
        ],
      } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      subtotal: true,
      discountTotal: true,
      total: true,
      currencyCode: true,
      issuedAt: true,
      createdAt: true,
      patient: { select: { mrn: true, firstName: true, lastName: true } },
      _count: {
        select: {
          items: true,
          payments: { where: { status: "COMPLETED" } },
        },
      },
    },
  });

  return {
    items: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      patient: {
        mrn: invoice.patient.mrn,
        displayName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
      },
      status: invoice.status,
      subtotal: money(invoice.subtotal),
      discountTotal: money(invoice.discountTotal),
      total: money(invoice.total),
      currencyCode: invoice.currencyCode,
      itemCount: invoice._count.items,
      completedPaymentCount: invoice._count.payments,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
    })),
    limit: 100,
  };
}

export async function getCashierInvoiceDetail(invoiceId: string) {
  const prisma = getPrismaClient();
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: invoiceDetailInclude });
  if (!invoice) fail("BILLING_INVOICE_NOT_FOUND", "The invoice was not found.", 404);
  return serializeInvoice(invoice);
}

