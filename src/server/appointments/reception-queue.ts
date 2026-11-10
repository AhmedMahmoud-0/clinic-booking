import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { fromClinicLocalDateTime, toClinicLocalDateTime } from "../../lib/clinic-time";
import { getPrismaClient } from "../db/client";
import { AppointmentBookingError } from "./appointment-booking-errors";
import {
  getQueueWaitingMinutes,
  isActiveReceptionQueueActor,
  summarizeReceptionQueue,
} from "./reception-queue-policy";
import { decideQueueCallNext } from "./walk-in-registration-policy";

type Transaction = Prisma.TransactionClient;

function queueError(code: string, message: string, status: number): never {
  throw new AppointmentBookingError(code, message, status);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function assertActiveReceptionEmployee(transaction: Transaction, actorEmployeeId: string): Promise<void> {
  const employee = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: {
      status: true,
      roleAssignments: {
        where: { status: "ACTIVE" },
        select: { role: true },
      },
    },
  });

  if (!employee || !isActiveReceptionQueueActor({
    employeeStatus: employee.status,
    activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
  })) {
    queueError("RECEPTION_PERMISSION_REQUIRED", "An active Reception employee is required to access the doctor queue.", 403);
  }
}

function localQueueDate(now: Date) {
  const localDate = toClinicLocalDateTime(now).localDate;
  return { localDate, queueDate: new Date(`${localDate}T00:00:00.000Z`) };
}

function nextLocalDate(localDate: string): string {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function findActiveDoctor(transaction: Transaction, doctorId: string) {
  const doctor = await transaction.doctorProfile.findFirst({
    where: { id: doctorId, employee: { is: { status: "ACTIVE" } } },
    select: {
      id: true,
      publicDisplayName: true,
      professionalTitle: true,
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  if (!doctor) queueError("DOCTOR_NOT_FOUND", "The active doctor could not be found.", 404);
  return {
    id: doctor.id,
    displayName: doctor.publicDisplayName?.trim() || [doctor.professionalTitle, doctor.employee.firstName, doctor.employee.lastName].filter(Boolean).join(" "),
  };
}

const queueEntrySelect = {
  id: true,
  queueNumber: true,
  type: true,
  status: true,
  checkedInAt: true,
  calledAt: true,
  serviceStartedAt: true,
  completedAt: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      mrn: true,
      isActive: true,
    },
  },
  appointment: { select: { id: true, startsAt: true, endsAt: true } },
} satisfies Prisma.QueueEntrySelect;

type QueueEntryDtoSource = Prisma.QueueEntryGetPayload<{ select: typeof queueEntrySelect }>;

function toQueueEntryDto(entry: QueueEntryDtoSource, now: Date) {
  const patientName = [entry.patient.firstName, entry.patient.middleName, entry.patient.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");

  return {
    id: entry.id,
    queueNumber: entry.queueNumber,
    type: entry.type,
    status: entry.status,
    checkedInAt: entry.checkedInAt.toISOString(),
    calledAt: entry.calledAt?.toISOString() ?? null,
    serviceStartedAt: entry.serviceStartedAt?.toISOString() ?? null,
    completedAt: entry.completedAt?.toISOString() ?? null,
    waitingMinutes: getQueueWaitingMinutes({ checkedInAt: entry.checkedInAt, now, status: entry.status }),
    patient: {
      id: entry.patient.id,
      name: patientName,
      mrn: entry.patient.mrn,
      isActive: entry.patient.isActive,
    },
    appointment: entry.appointment
      ? {
          id: entry.appointment.id,
          startsAt: entry.appointment.startsAt.toISOString(),
          endsAt: entry.appointment.endsAt.toISOString(),
        }
      : null,
  };
}

/** Reception-only, current Cairo-local-day queue DTO for one active doctor. */
export async function getReceptionDoctorQueue(doctorId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (transaction: Transaction) => {
    await assertActiveReceptionEmployee(transaction, actorEmployeeId);
    const now = new Date();
    const { localDate, queueDate } = localQueueDate(now);
    const doctor = await findActiveDoctor(transaction, doctorId);
    const entries = await transaction.queueEntry.findMany({
      where: { doctorId, queueDate },
      orderBy: { queueNumber: "asc" },
      select: queueEntrySelect,
    });
    const statuses = entries.map((entry) => entry.status);

    return {
      doctor,
      queueDate: localDate,
      summary: summarizeReceptionQueue(statuses),
      entries: entries.map((entry) => toQueueEntryDto(entry, now)),
    };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 15_000 });
}

/**
 * Atomically call the next queue ticket while preserving scheduled-appointment
 * priority over walk-ins. An unended CONFIRMED appointment holds walk-ins even
 * before the booked patient reaches Reception. A called walk-in is returned to
 * WAITING if an appointment subsequently takes priority.
 */
export async function callNextReceptionQueueEntry(doctorId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      await assertActiveReceptionEmployee(transaction, actorEmployeeId);
      const lockedDoctor = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "DoctorProfile" WHERE "id" = ${doctorId} FOR UPDATE
      `;
      if (lockedDoctor.length !== 1) {
        queueError("DOCTOR_NOT_FOUND", "The active doctor could not be found.", 404);
      }
      const doctor = await findActiveDoctor(transaction, doctorId);
      const now = new Date();
      const { localDate, queueDate } = localQueueDate(now);
      const dayEnd = fromClinicLocalDateTime(nextLocalDate(localDate), 0);
      if (!dayEnd) {
        queueError("CLINIC_LOCAL_DATE_UNAVAILABLE", "The current Cairo-local day could not be represented.", 409);
      }

      const inService = await transaction.queueEntry.findFirst({
        where: { doctorId, queueDate, status: "IN_SERVICE" },
        orderBy: { queueNumber: "asc" },
        select: queueEntrySelect,
      });
      if (inService) {
        return {
          outcome: "PATIENT_IN_SERVICE" as const,
          doctor,
          queueDate: localDate,
          entry: toQueueEntryDto(inService, now),
        };
      }

      const currentCalled = await transaction.queueEntry.findFirst({
        where: { doctorId, queueDate, status: "CALLED" },
        orderBy: { queueNumber: "asc" },
        select: queueEntrySelect,
      });
      const [nextWaitingAppointment, nextWaitingWalkIn, unfinishedConfirmedAppointment] = await Promise.all([
        transaction.queueEntry.findFirst({
          where: { doctorId, queueDate, type: "APPOINTMENT", status: "WAITING" },
          orderBy: { queueNumber: "asc" },
          select: queueEntrySelect,
        }),
        transaction.queueEntry.findFirst({
          where: { doctorId, queueDate, type: "WALK_IN", status: "WAITING" },
          orderBy: { queueNumber: "asc" },
          select: queueEntrySelect,
        }),
        transaction.appointment.findFirst({
          where: {
            doctorId,
            status: "CONFIRMED",
            startsAt: { lt: dayEnd },
            endsAt: { gt: now },
          },
          select: { id: true },
        }),
      ]);

      let decision = decideQueueCallNext({
        currentCalledEntry: currentCalled ? { id: currentCalled.id, type: currentCalled.type } : null,
        nextWaitingAppointment: nextWaitingAppointment
          ? { id: nextWaitingAppointment.id, patientIsActive: nextWaitingAppointment.patient.isActive }
          : null,
        nextWaitingWalkIn: nextWaitingWalkIn
          ? { id: nextWaitingWalkIn.id, patientIsActive: nextWaitingWalkIn.patient.isActive }
          : null,
        hasUnfinishedConfirmedAppointment: unfinishedConfirmedAppointment !== null,
      });

      if (decision.kind === "RETURN_CURRENT_APPOINTMENT_CALL" && currentCalled) {
        return {
          outcome: "ALREADY_CALLED" as const,
          doctor,
          queueDate: localDate,
          entry: toQueueEntryDto(currentCalled, now),
        };
      }
      if (decision.kind === "RETURN_CURRENT_WALK_IN_CALL" && currentCalled) {
        return {
          outcome: "ALREADY_CALLED" as const,
          doctor,
          queueDate: localDate,
          entry: toQueueEntryDto(currentCalled, now),
        };
      }
      if (decision.kind === "DEFER_CURRENT_WALK_IN" && currentCalled) {
        const deferred = await transaction.queueEntry.updateMany({
          where: { id: currentCalled.id, doctorId, queueDate, type: "WALK_IN", status: "CALLED" },
          data: { status: "WAITING", calledAt: null },
        });
        if (deferred.count !== 1) {
          queueError("QUEUE_STATE_CHANGED", "The called walk-in ticket changed before scheduled appointments could take priority. Refresh and try again.", 409);
        }
        await transaction.auditLog.create({
          data: {
            actorType: "EMPLOYEE",
            actorEmployeeId,
            action: "RECEPTION_WALK_IN_CALL_DEFERRED_FOR_APPOINTMENT",
            entityType: "QueueEntry",
            entityId: currentCalled.id,
            reason: `Reception returned called WALK_IN ticket ${currentCalled.queueNumber} to WAITING so a scheduled appointment could take priority. No patient or clinical details were copied to the audit record.`,
            occurredAt: now,
          },
        });
        decision = decideQueueCallNext({
          currentCalledEntry: null,
          nextWaitingAppointment: nextWaitingAppointment
            ? { id: nextWaitingAppointment.id, patientIsActive: nextWaitingAppointment.patient.isActive }
            : null,
          nextWaitingWalkIn: nextWaitingWalkIn
            ? { id: nextWaitingWalkIn.id, patientIsActive: nextWaitingWalkIn.patient.isActive }
            : null,
          hasUnfinishedConfirmedAppointment: unfinishedConfirmedAppointment !== null,
        });
      }

      if (decision.kind === "SCHEDULED_APPOINTMENTS_PENDING") {
        return { outcome: "SCHEDULED_APPOINTMENTS_PENDING" as const, doctor, queueDate: localDate, entry: null };
      }
      if (decision.kind === "QUEUE_EMPTY") {
        return { outcome: "QUEUE_EMPTY" as const, doctor, queueDate: localDate, entry: null };
      }
      if (decision.kind === "BLOCK_INACTIVE_PATIENT") {
        queueError(
          "QUEUE_HEAD_PATIENT_INACTIVE",
          "The next patient in the priority queue is inactive. Resolve this patient before calling another ticket; the queue was not skipped or reordered.",
          409,
        );
      }

      const nextWaiting = decision.kind === "CALL_APPOINTMENT"
        ? nextWaitingAppointment
        : decision.kind === "CALL_WALK_IN"
          ? nextWaitingWalkIn
          : null;
      if (!nextWaiting || (decision.kind !== "CALL_APPOINTMENT" && decision.kind !== "CALL_WALK_IN")) {
        queueError("QUEUE_STATE_CHANGED", "The queue changed before the next patient could be called. Refresh and try again.", 409);
      }

      const update = await transaction.queueEntry.updateMany({
        where: { id: nextWaiting.id, doctorId, queueDate, status: "WAITING" },
        data: { status: "CALLED", calledAt: now },
      });
      if (update.count !== 1) {
        queueError("QUEUE_STATE_CHANGED", "The queue changed before the next patient could be called. Refresh and try again.", 409);
      }

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: decision.kind === "CALL_APPOINTMENT" ? "RECEPTION_APPOINTMENT_QUEUE_CALLED_NEXT" : "RECEPTION_WALK_IN_QUEUE_CALLED_NEXT",
          entityType: "QueueEntry",
          entityId: nextWaiting.id,
          reason: `Reception called ${nextWaiting.type} queue ticket ${nextWaiting.queueNumber} for the doctor on ${localDate}. Scheduled appointments take priority over walk-ins. No patient or clinical details were copied to the audit record.`,
          occurredAt: now,
        },
      });

      const calledEntry = { ...nextWaiting, status: "CALLED" as const, calledAt: now };
      return {
        outcome: "CALLED" as const,
        doctor,
        queueDate: localDate,
        entry: toQueueEntryDto(calledEntry as QueueEntryDtoSource, now),
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      queueError("QUEUE_CONCURRENT_CHANGE", "The doctor queue changed concurrently. Refresh and call the next ticket again.", 409);
    }
    throw error;
  }
}
