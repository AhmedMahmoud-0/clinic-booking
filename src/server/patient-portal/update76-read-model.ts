import "server-only";

import { randomBytes } from "node:crypto";
import { getPrismaClient } from "../db/client";
import { AccountLinkError } from "../auth/account-linking/common";
import type { CreatePatientComplaintInput } from "./update76-validation";

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function money(value: { toFixed: (digits: number) => string }): string {
  return value.toFixed(2);
}

function doctorName(doctor: {
  publicDisplayName: string | null;
  professionalTitle: string | null;
  employee: { firstName: string; lastName: string };
}): string {
  return doctor.publicDisplayName?.trim() ||
    [doctor.employee.firstName, doctor.employee.lastName].filter(Boolean).join(" ") ||
    "Medical doctor";
}

const doctorSelect = {
  publicDisplayName: true,
  professionalTitle: true,
  employee: { select: { firstName: true, lastName: true } },
  specialties: {
    orderBy: { isPrimary: "desc" as const },
    take: 1,
    select: { specialty: { select: { name: true } } },
  },
} as const;

export async function getPatientPortalRecords(patientId: string) {
  const prisma = getPrismaClient();
  const [visits, prescriptions, labResults, radiologyReports] = await Promise.all([
    prisma.encounter.findMany({
      where: { patientId, status: "COMPLETED" },
      orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        doctor: { select: doctorSelect },
        diagnoses: {
          orderBy: [{ isPrimary: "desc" }, { recordedAt: "asc" }],
          select: { displayNameSnapshot: true, isPrimary: true },
        },
      },
    }),
    prisma.prescription.findMany({
      where: {
        status: "ISSUED",
        issuedAt: { not: null },
        encounter: { patientId, status: "COMPLETED" },
      },
      orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        status: true,
        generalInstructions: true,
        issuedAt: true,
        encounter: {
          select: {
            id: true,
            completedAt: true,
            doctor: { select: doctorSelect },
          },
        },
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            medicationName: true,
            strength: true,
            dosage: true,
            route: true,
            frequency: true,
            durationDays: true,
            quantity: true,
            quantityUnit: true,
            isPrn: true,
            refills: true,
            instructions: true,
          },
        },
      },
    }),
    prisma.labResult.findMany({
      where: {
        status: "RELEASED",
        releasedAt: { not: null },
        orderItem: {
          labOrder: {
            OR: [
              { encounter: { patientId, status: "COMPLETED" } },
              { externalIntake: { patientId } },
            ],
          },
        },
      },
      orderBy: [{ releasedAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        resultSummary: true,
        resultedAt: true,
        releasedAt: true,
        orderItem: {
          select: {
            labTest: { select: { code: true, name: true } },
            labOrder: { select: { orderReference: true } },
          },
        },
        values: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            componentCodeSnapshot: true,
            componentNameSnapshot: true,
            valueType: true,
            valueText: true,
            valueNumeric: true,
            valueBoolean: true,
            unitSnapshot: true,
            referenceRangeSnapshot: true,
            abnormalFlag: true,
          },
        },
      },
    }),
    prisma.radiologyReport.findMany({
      where: {
        status: "RELEASED",
        releasedAt: { not: null },
        exam: {
          orderItem: {
            radiologyOrder: { encounter: { patientId, status: "COMPLETED" } },
          },
        },
      },
      orderBy: [{ releasedAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        findings: true,
        impression: true,
        recommendations: true,
        authoredAt: true,
        approvedAt: true,
        releasedAt: true,
        exam: {
          select: {
            performedAt: true,
            orderItem: {
              select: {
                procedure: { select: { code: true, name: true, modality: true } },
                radiologyOrder: { select: { orderReference: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    visits: visits.map((visit) => ({
      id: visit.id,
      startedAt: visit.startedAt.toISOString(),
      completedAt: iso(visit.completedAt),
      doctor: {
        name: doctorName(visit.doctor),
        professionalTitle: visit.doctor.professionalTitle,
        specialty: visit.doctor.specialties[0]?.specialty.name ?? null,
      },
      diagnoses: visit.diagnoses.map((diagnosis) => ({
        name: diagnosis.displayNameSnapshot,
        isPrimary: diagnosis.isPrimary,
      })),
    })),
    prescriptions: prescriptions.map((prescription) => ({
      id: prescription.id,
      issuedAt: iso(prescription.issuedAt),
      generalInstructions: prescription.generalInstructions,
      doctor: doctorName(prescription.encounter.doctor),
      items: prescription.items.map((item) => ({
        id: item.id,
        medicationName: item.medicationName,
        strength: item.strength,
        dosage: item.dosage,
        route: item.route,
        frequency: item.frequency,
        durationDays: item.durationDays,
        quantity: item.quantity?.toString() ?? null,
        quantityUnit: item.quantityUnit,
        isPrn: item.isPrn,
        refills: item.refills,
        instructions: item.instructions,
      })),
    })),
    labResults: labResults.map((result) => ({
      id: result.id,
      test: result.orderItem.labTest,
      orderReference: result.orderItem.labOrder.orderReference,
      summary: result.resultSummary,
      resultedAt: result.resultedAt.toISOString(),
      releasedAt: iso(result.releasedAt),
      values: result.values.map((value) => ({
        componentCode: value.componentCodeSnapshot,
        componentName: value.componentNameSnapshot,
        valueType: value.valueType,
        valueText: value.valueText,
        valueNumeric: value.valueNumeric?.toString() ?? null,
        valueBoolean: value.valueBoolean,
        unit: value.unitSnapshot,
        referenceRange: value.referenceRangeSnapshot,
        abnormalFlag: value.abnormalFlag,
      })),
    })),
    radiologyReports: radiologyReports.map((report) => ({
      id: report.id,
      procedure: report.exam.orderItem.procedure,
      orderReference: report.exam.orderItem.radiologyOrder.orderReference,
      performedAt: iso(report.exam.performedAt),
      authoredAt: report.authoredAt.toISOString(),
      approvedAt: iso(report.approvedAt),
      releasedAt: iso(report.releasedAt),
      findings: report.findings,
      impression: report.impression,
      recommendations: report.recommendations,
    })),
  };
}

export async function getPatientBilling(patientId: string) {
  const prisma = getPrismaClient();
  const invoices = await prisma.invoice.findMany({
    where: {
      patientId,
      status: { in: ["ISSUED", "PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
    },
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
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
      payments: {
        where: { status: "COMPLETED" },
        orderBy: [{ paidAt: "desc" }, { id: "desc" }],
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
        orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
        select: {
          refundReference: true,
          amount: true,
          currencyCode: true,
          status: true,
          requestedAt: true,
          completedAt: true,
        },
      },
    },
  });

  return invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    subtotal: money(invoice.subtotal),
    discountTotal: money(invoice.discountTotal),
    total: money(invoice.total),
    currencyCode: invoice.currencyCode,
    issuedAt: iso(invoice.issuedAt),
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      discountAmount: money(item.discountAmount),
      lineTotal: money(item.lineTotal),
      currencyCode: item.currencyCode,
    })),
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      amount: money(payment.amount),
      currencyCode: payment.currencyCode,
      method: payment.method,
      transactionReference: payment.transactionReference,
      paidAt: payment.paidAt.toISOString(),
    })),
    refunds: invoice.refunds.map((refund) => ({
      reference: refund.refundReference,
      amount: money(refund.amount),
      currencyCode: refund.currencyCode,
      status: refund.status,
      requestedAt: refund.requestedAt.toISOString(),
      completedAt: iso(refund.completedAt),
    })),
  }));
}

export async function getPatientComplaints(patientId: string) {
  const prisma = getPrismaClient();
  const complaints = await prisma.complaint.findMany({
    where: { patientId },
    orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      referenceNumber: true,
      category: true,
      status: true,
      subject: true,
      description: true,
      receivedAt: true,
      acknowledgedAt: true,
      resolvedAt: true,
      closedAt: true,
      events: {
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
        select: { eventType: true, fromStatus: true, toStatus: true, occurredAt: true },
      },
    },
  });

  return complaints.map((complaint) => ({
    id: complaint.id,
    referenceNumber: complaint.referenceNumber,
    category: complaint.category,
    status: complaint.status,
    subject: complaint.subject,
    description: complaint.description,
    receivedAt: complaint.receivedAt.toISOString(),
    acknowledgedAt: iso(complaint.acknowledgedAt),
    resolvedAt: iso(complaint.resolvedAt),
    closedAt: iso(complaint.closedAt),
    history: complaint.events.map((event) => ({
      type: event.eventType,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      occurredAt: event.occurredAt.toISOString(),
    })),
  }));
}

function createComplaintReference(): string {
  const now = new Date();
  const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `MER-CMP-${date}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function createPatientComplaint(patientId: string, input: CreatePatientComplaintInput) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findFirst({
      where: { id: patientId, isActive: true },
      select: { id: true },
    });
    if (!patient) throw new AccountLinkError("PATIENT_PROFILE_UNAVAILABLE", "Your patient profile is not available.", 403);

    if (input.appointmentId) {
      const appointment = await tx.appointment.findFirst({
        where: { id: input.appointmentId, patientId },
        select: { id: true },
      });
      if (!appointment) throw new AccountLinkError("COMPLAINT_APPOINTMENT_NOT_FOUND", "The selected appointment was not found in your account.", 404);
    }
    if (input.invoiceId) {
      const invoice = await tx.invoice.findFirst({
        where: { id: input.invoiceId, patientId, status: { notIn: ["DRAFT", "VOIDED"] } },
        select: { id: true },
      });
      if (!invoice) throw new AccountLinkError("COMPLAINT_INVOICE_NOT_FOUND", "The selected invoice was not found in your account.", 404);
    }

    const complaint = await tx.complaint.create({
      data: {
        referenceNumber: createComplaintReference(),
        patientId,
        ...(input.appointmentId ? { appointmentId: input.appointmentId } : {}),
        ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
        channel: "PATIENT_PORTAL",
        category: input.category,
        status: "RECEIVED",
        subject: input.subject,
        description: input.description,
        receivedAt: new Date(),
        events: { create: { eventType: "RECEIVED", toStatus: "RECEIVED" } },
      },
      select: { id: true, referenceNumber: true, status: true, receivedAt: true, subject: true },
    });
    return {
      id: complaint.id,
      referenceNumber: complaint.referenceNumber,
      status: complaint.status,
      receivedAt: complaint.receivedAt.toISOString(),
      subject: complaint.subject,
    };
  }, { isolationLevel: "Serializable" });
}

export async function getPatientNotifications(patientId: string) {
  const prisma = getPrismaClient();
  const now = new Date();
  const notifications = await prisma.notification.findMany({
    where: {
      patientId,
      channel: "IN_APP",
      status: { in: ["SENT", "DELIVERED", "READ"] },
      scheduledAt: { lte: now },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      sentAt: true,
      deliveredAt: true,
      readAt: true,
      createdAt: true,
    },
  });
  return notifications.map((notification) => ({
    id: notification.id,
    title: "Patient account update",
    message: "A secure update is available in your patient portal. Open the relevant section to review it.",
    status: notification.status,
    createdAt: notification.createdAt.toISOString(),
    sentAt: iso(notification.sentAt),
    deliveredAt: iso(notification.deliveredAt),
    readAt: iso(notification.readAt),
    isRead: notification.status === "READ" || notification.readAt !== null,
  }));
}

export async function markPatientNotificationRead(patientId: string, notificationId: string): Promise<boolean> {
  const prisma = getPrismaClient();
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      patientId,
      channel: "IN_APP",
      status: { in: ["SENT", "DELIVERED"] },
      scheduledAt: { lte: new Date() },
    },
    data: { status: "READ", readAt: new Date() },
  });
  if (result.count > 0) return true;
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, patientId, channel: "IN_APP", status: "READ" },
    select: { id: true },
  });
  return existing !== null;
}
