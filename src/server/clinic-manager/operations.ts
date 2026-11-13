import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import {
  averageMinutes,
  canTransitionComplaint,
  canTransitionIncident,
  getCairoReportWindow,
  startOfCairoDay,
} from "./operations-policy";
import type {
  ComplaintStatus,
  CreateIncidentInput,
  CreateReceptionComplaintInput,
  OperationalReportQuery,
} from "./operations-validation";

export class ClinicManagerOperationsError extends Error {
  constructor(readonly code: string, message: string, readonly status = 409) {
    super(message);
    this.name = "ClinicManagerOperationsError";
  }
}

function makeReference(prefix: "MER-CMP" | "MER-INC"): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()).replaceAll("-", "");
  return `${prefix}-${day}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

type Tx = Prisma.TransactionClient;

async function writeEmployeeAudit(
  tx: Tx,
  employeeId: string,
  action: string,
  entityType: string,
  entityId: string,
  reason?: string,
) {
  await tx.auditLog.create({
    data: { actorType: "EMPLOYEE", actorEmployeeId: employeeId, action, entityType, entityId, reason: reason?.slice(0, 500) },
  });
}

export async function getClinicManagerComplaints(status?: ComplaintStatus) {
  const prisma = getPrismaClient();
  const complaints = await prisma.complaint.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true, referenceNumber: true, channel: true, category: true, status: true,
      subject: true, description: true, submitterName: true, submitterPhone: true, submitterEmail: true,
      receivedAt: true, acknowledgedAt: true,
      resolvedAt: true, closedAt: true,
      patientId: true,
      appointment: { select: { bookingReference: true, startsAt: true } },
      invoice: { select: { invoiceNumber: true } },
      createdByEmployee: { select: { employeeNumber: true, firstName: true, lastName: true } },
      assignedToEmployee: { select: { employeeNumber: true, firstName: true, lastName: true } },
      events: {
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: 12,
        select: {
          eventType: true, fromStatus: true, toStatus: true, note: true, occurredAt: true,
          actorEmployee: { select: { employeeNumber: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  const [total, filteredTotal, byStatus] = await Promise.all([
    prisma.complaint.count(),
    prisma.complaint.count({ where: status ? { status } : undefined }),
    prisma.complaint.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    items: complaints.map((item) => ({
      id: item.id, referenceNumber: item.referenceNumber, channel: item.channel, category: item.category,
      status: item.status, subject: item.subject, description: item.description,
      submitter: item.submitterName || item.submitterPhone || item.submitterEmail
        ? { name: item.submitterName, phone: item.submitterPhone, email: item.submitterEmail }
        : null,
      receivedAt: item.receivedAt.toISOString(), acknowledgedAt: item.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: item.resolvedAt?.toISOString() ?? null, closedAt: item.closedAt?.toISOString() ?? null,
      patientLinked: Boolean(item.patientId),
      appointment: item.appointment ? { reference: item.appointment.bookingReference, startsAt: item.appointment.startsAt.toISOString() } : null,
      invoiceNumber: item.invoice?.invoiceNumber ?? null,
      createdBy: item.createdByEmployee ? { employeeNumber: item.createdByEmployee.employeeNumber, displayName: `${item.createdByEmployee.firstName} ${item.createdByEmployee.lastName}`.trim() } : null,
      assignedTo: item.assignedToEmployee ? { employeeNumber: item.assignedToEmployee.employeeNumber, displayName: `${item.assignedToEmployee.firstName} ${item.assignedToEmployee.lastName}`.trim() } : null,
      events: item.events.map((event) => ({
        eventType: event.eventType, fromStatus: event.fromStatus, toStatus: event.toStatus,
        note: event.note, occurredAt: event.occurredAt.toISOString(),
        actor: event.actorEmployee ? `${event.actorEmployee.firstName} ${event.actorEmployee.lastName}`.trim() : null,
      })),
    })),
    total,
    filteredTotal,
    statusCounts: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
    limit: 100,
    hasMore: filteredTotal > complaints.length,
  };
}

export async function recordReceptionComplaint(employeeId: string, input: CreateReceptionComplaintInput) {
  const prisma = getPrismaClient();
  const referenceNumber = makeReference("MER-CMP");
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.create({
      data: {
        referenceNumber,
        channel: input.channel,
        category: input.category,
        status: "RECEIVED",
        subject: input.subject,
        description: input.description,
        submitterName: input.submitterName || null,
        submitterPhone: input.submitterPhone || null,
        submitterEmail: input.submitterEmail || null,
        createdByEmployeeId: employeeId,
        receivedAt: new Date(),
        events: { create: { eventType: "RECEIVED", toStatus: "RECEIVED", actorEmployeeId: employeeId } },
      },
      select: { id: true, referenceNumber: true, channel: true, status: true, receivedAt: true, subject: true },
    });
    await writeEmployeeAudit(
      tx,
      employeeId,
      "COMPLAINT_RECORDED_AT_RECEPTION",
      "Complaint",
      complaint.id,
      `Reception intake via ${input.channel}`,
    );
    return {
      id: complaint.id,
      referenceNumber: complaint.referenceNumber,
      channel: complaint.channel,
      status: complaint.status,
      receivedAt: complaint.receivedAt.toISOString(),
      subject: complaint.subject,
    };
  }, { isolationLevel: "Serializable" });
}

export async function transitionClinicManagerComplaint(
  complaintId: string,
  employeeId: string,
  input: { status: "RECEIVED" | "ACKNOWLEDGED" | "IN_REVIEW" | "RESOLVED" | "CLOSED" | "REJECTED"; note?: string },
) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const current = await tx.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true, referenceNumber: true, status: true, acknowledgedAt: true, resolvedAt: true, closedAt: true },
    });
    if (!current) throw new ClinicManagerOperationsError("COMPLAINT_NOT_FOUND", "The complaint was not found.", 404);
    if (!canTransitionComplaint(current.status, input.status)) {
      throw new ClinicManagerOperationsError("COMPLAINT_TRANSITION_INVALID", "This complaint cannot move to the selected status.");
    }
    const now = new Date();
    const eventType = input.status === "ACKNOWLEDGED" ? "ACKNOWLEDGED"
      : input.status === "RESOLVED" ? "RESOLVED"
      : input.status === "CLOSED" ? "CLOSED"
      : "STATUS_CHANGED";
    const updated = await tx.complaint.update({
      where: { id: complaintId },
      data: {
        status: input.status,
        acknowledgedAt: input.status === "ACKNOWLEDGED" ? current.acknowledgedAt ?? now : undefined,
        resolvedAt: input.status === "RESOLVED" ? now : input.status === "IN_REVIEW" ? null : undefined,
        closedAt: input.status === "CLOSED" ? now : undefined,
      },
      select: { id: true, referenceNumber: true, status: true, updatedAt: true },
    });
    await tx.complaintEvent.create({
      data: {
        complaintId, eventType, fromStatus: current.status, toStatus: input.status,
        note: input.note ?? null, actorEmployeeId: employeeId,
      },
    });
    await writeEmployeeAudit(tx, employeeId, `COMPLAINT_${input.status}`, "Complaint", complaintId, input.note);
    return { ...updated, updatedAt: updated.updatedAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}

export async function getClinicManagerIncidents() {
  const prisma = getPrismaClient();
  const [items, byStatus, bySeverity] = await Promise.all([
    prisma.incidentReport.findMany({
      orderBy: [{ reportedAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true, referenceNumber: true, category: true, severity: true, status: true,
        occurredAt: true, reportedAt: true, summary: true, description: true,
        immediateActions: true, resolutionNotes: true, resolvedAt: true, closedAt: true,
        reportedByEmployee: { select: { employeeNumber: true, firstName: true, lastName: true } },
        assignedToEmployee: { select: { employeeNumber: true, firstName: true, lastName: true } },
      },
    }),
    prisma.incidentReport.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.incidentReport.groupBy({ by: ["severity"], _count: { _all: true }, where: { status: { notIn: ["CLOSED", "RESOLVED"] } } }),
  ]);
  const auditEvents = items.length ? await prisma.auditLog.findMany({
    where: { entityType: "IncidentReport", entityId: { in: items.map((item) => item.id) } },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: 2000,
    select: {
      id: true, entityId: true, action: true, reason: true, occurredAt: true,
      actorEmployee: { select: { firstName: true, lastName: true, employeeNumber: true } },
    },
  }) : [];
  return {
    items: items.map((item) => ({
      id: item.id, referenceNumber: item.referenceNumber, category: item.category,
      severity: item.severity, status: item.status, occurredAt: item.occurredAt.toISOString(),
      reportedAt: item.reportedAt.toISOString(), summary: item.summary, description: item.description,
      immediateActions: item.immediateActions, resolutionNotes: item.resolutionNotes,
      resolvedAt: item.resolvedAt?.toISOString() ?? null, closedAt: item.closedAt?.toISOString() ?? null,
      reportedBy: { employeeNumber: item.reportedByEmployee.employeeNumber, displayName: `${item.reportedByEmployee.firstName} ${item.reportedByEmployee.lastName}`.trim() },
      assignedTo: item.assignedToEmployee ? { employeeNumber: item.assignedToEmployee.employeeNumber, displayName: `${item.assignedToEmployee.firstName} ${item.assignedToEmployee.lastName}`.trim() } : null,
      events: auditEvents.filter((event) => event.entityId === item.id).slice(0, 20).map((event) => ({
        id: event.id, action: event.action, reason: event.reason, occurredAt: event.occurredAt.toISOString(),
        actor: event.actorEmployee ? `${event.actorEmployee.firstName} ${event.actorEmployee.lastName}`.trim() : null,
        actorEmployeeNumber: event.actorEmployee?.employeeNumber ?? null,
      })),
    })),
    statusCounts: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
    openSeverityCounts: bySeverity.map((item) => ({ severity: item.severity, count: item._count._all })),
    limit: 100,
  };
}

export async function createClinicManagerIncident(employeeId: string, input: CreateIncidentInput) {
  const prisma = getPrismaClient();
  const referenceNumber = makeReference("MER-INC");
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incidentReport.create({
      data: {
        referenceNumber, category: input.category, severity: input.severity,
        occurredAt: new Date(input.occurredAt), summary: input.summary,
        description: input.description, immediateActions: input.immediateActions || null,
        reportedByEmployeeId: employeeId,
      },
      select: { id: true, referenceNumber: true, category: true, severity: true, status: true, occurredAt: true, reportedAt: true, summary: true },
    });
    await writeEmployeeAudit(tx, employeeId, "INCIDENT_REPORTED", "IncidentReport", incident.id, input.summary);
    return { ...incident, occurredAt: incident.occurredAt.toISOString(), reportedAt: incident.reportedAt.toISOString() };
  });
}

export async function transitionClinicManagerIncident(
  incidentId: string,
  employeeId: string,
  input: { status: "REPORTED" | "UNDER_REVIEW" | "ACTION_REQUIRED" | "RESOLVED" | "CLOSED"; note?: string },
) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const current = await tx.incidentReport.findUnique({
      where: { id: incidentId },
      select: { id: true, referenceNumber: true, status: true, resolutionNotes: true },
    });
    if (!current) throw new ClinicManagerOperationsError("INCIDENT_NOT_FOUND", "The incident was not found.", 404);
    if (!canTransitionIncident(current.status, input.status)) {
      throw new ClinicManagerOperationsError("INCIDENT_TRANSITION_INVALID", "This incident cannot move to the selected status.");
    }
    const now = new Date();
    const updated = await tx.incidentReport.update({
      where: { id: incidentId },
      data: {
        status: input.status,
        resolvedAt: input.status === "RESOLVED" ? now : input.status === "UNDER_REVIEW" || input.status === "ACTION_REQUIRED" ? null : undefined,
        closedAt: input.status === "CLOSED" ? now : undefined,
        resolutionNotes: input.note ? [current.resolutionNotes, input.note].filter(Boolean).join("\n\n") : undefined,
      },
      select: { id: true, referenceNumber: true, status: true, resolvedAt: true, closedAt: true, updatedAt: true },
    });
    await writeEmployeeAudit(tx, employeeId, `INCIDENT_${input.status}`, "IncidentReport", incidentId, input.note);
    return {
      ...updated,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      closedAt: updated.closedAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }, { isolationLevel: "Serializable" });
}

export async function getClinicManagerOperationalReport(query: OperationalReportQuery) {
  const prisma = getPrismaClient();
  const { startsAt, endsAt } = getCairoReportWindow(query.from, query.to);
  const dateFilter = { gte: startsAt, lt: endsAt };
  const [appointmentGroups, completedByDoctor, patientCount, completedVisitCount, queueRows,
    releasedLab, pendingLabReviews, releasedRadiology, pendingRadiologyApprovals,
    complaintGroups, incidentGroups] = await Promise.all([
    prisma.appointment.groupBy({ by: ["status"], where: { startsAt: dateFilter }, _count: { _all: true } }),
    prisma.encounter.groupBy({ by: ["doctorId"], where: { status: "COMPLETED", completedAt: dateFilter }, _count: { _all: true } }),
    prisma.patient.count({ where: { createdAt: dateFilter } }),
    prisma.encounter.count({ where: { status: "COMPLETED", completedAt: dateFilter } }),
    prisma.queueEntry.findMany({
      where: { checkedInAt: dateFilter, serviceStartedAt: { not: null } },
      select: { checkedInAt: true, serviceStartedAt: true },
      take: 5000,
    }),
    prisma.labResult.findMany({
      where: { status: "RELEASED", releasedAt: dateFilter },
      select: { resultedAt: true, releasedAt: true }, take: 5000,
    }),
    prisma.labResult.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.radiologyReport.findMany({
      where: { status: "RELEASED", releasedAt: dateFilter },
      select: { authoredAt: true, releasedAt: true }, take: 5000,
    }),
    prisma.radiologyReport.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.complaint.groupBy({ by: ["status"], where: { receivedAt: dateFilter }, _count: { _all: true } }),
    prisma.incidentReport.groupBy({ by: ["status"], where: { reportedAt: dateFilter }, _count: { _all: true } }),
  ]);

  const doctorIds = completedByDoctor.map((item) => item.doctorId);
  const doctors = doctorIds.length ? await prisma.doctorProfile.findMany({
    where: { id: { in: doctorIds } },
    select: {
      id: true,
      publicDisplayName: true,
      professionalTitle: true,
      employee: { select: { firstName: true, lastName: true } },
      specialties: {
        where: { isPrimary: true },
        take: 1,
        select: { specialty: { select: { name: true } } },
      },
    },
  }) : [];
  type DoctorPerformanceLookup = {
    id: string;
    publicDisplayName: string | null;
    professionalTitle: string | null;
    employee: { firstName: string; lastName: string };
    specialties: Array<{ specialty: { name: string } }>;
  };
  const doctorMap = new Map<string, DoctorPerformanceLookup>(doctors.map((doctor: DoctorPerformanceLookup) => [doctor.id, doctor]));
  const doctorPerformance = completedByDoctor.map((item) => {
    const doctor = doctorMap.get(item.doctorId);
    const displayName = doctor?.publicDisplayName?.trim() || `${doctor?.employee.firstName ?? ""} ${doctor?.employee.lastName ?? ""}`.trim() || "Doctor";
    return { doctorId: item.doctorId, displayName, professionalTitle: doctor?.professionalTitle ?? null, completedVisits: item._count._all };
  }).sort((left, right) => right.completedVisits - left.completedVisits || left.displayName.localeCompare(right.displayName));

  const visitsBySpecialtyTotals = new Map<string, number>();
  for (const item of completedByDoctor) {
    const doctor = doctorMap.get(item.doctorId);
    const specialtyName = doctor?.specialties[0]?.specialty.name ?? "Unassigned specialty";
    visitsBySpecialtyTotals.set(specialtyName, (visitsBySpecialtyTotals.get(specialtyName) ?? 0) + item._count._all);
  }
  const visitsBySpecialty = [...visitsBySpecialtyTotals.entries()]
    .map(([specialty, completedVisits]) => ({ specialty, completedVisits }))
    .sort((left, right) => right.completedVisits - left.completedVisits || left.specialty.localeCompare(right.specialty));

  const count = (groups: Array<{ status: string; _count: { _all: number } }>, status: string) => groups.find((item) => item.status === status)?._count._all ?? 0;
  const appointmentCounts = appointmentGroups.map((item) => ({ status: item.status, count: item._count._all }));
  const totalAppointments = appointmentCounts.reduce((sum, item) => sum + item.count, 0);
  const averageWaitMinutes = averageMinutes(queueRows.map((row) => ({ startedAt: row.checkedInAt, endedAt: row.serviceStartedAt })));
  const averageLabTurnaroundMinutes = averageMinutes(releasedLab.map((row) => ({ startedAt: row.resultedAt, endedAt: row.releasedAt })));
  const averageRadiologyTurnaroundMinutes = averageMinutes(releasedRadiology.map((row) => ({ startedAt: row.authoredAt, endedAt: row.releasedAt })));
  const day = startOfCairoDay();

  return {
    period: { from: query.from, to: query.to, timeZone: "Africa/Cairo" },
    summary: {
      totalAppointments,
      cancelledAppointments: count(appointmentGroups, "CANCELLED"),
      noShows: count(appointmentGroups, "NO_SHOW"),
      completedVisits: completedVisitCount,
      newPatients: patientCount,
      pendingLabReviews,
      pendingRadiologyApprovals,
      complaintsReceived: complaintGroups.reduce((sum, item) => sum + item._count._all, 0),
      incidentsReported: incidentGroups.reduce((sum, item) => sum + item._count._all, 0),
    },
    appointmentsByStatus: appointmentCounts,
    complaintStatusCounts: complaintGroups.map((item) => ({ status: item.status, count: item._count._all })),
    incidentStatusCounts: incidentGroups.map((item) => ({ status: item.status, count: item._count._all })),
    doctorPerformance,
    visitsBySpecialty,
    turnaround: {
      averageQueueWaitMinutes: averageWaitMinutes,
      averageLabTurnaroundMinutes,
      averageRadiologyTurnaroundMinutes,
      releasedLabResultsInPeriod: releasedLab.length,
      releasedRadiologyReportsInPeriod: releasedRadiology.length,
    },
    currentBacklogAsOf: { date: day.date, pendingLabReviews, pendingRadiologyApprovals },
    recordLimit: 5000,
  };
}
