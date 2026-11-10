import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { toClinicLocalDateTime } from "../../lib/clinic-time";
import { getPrismaClient } from "../db/client";
import { AppointmentBookingError } from "./appointment-booking-errors";
import { AppointmentAvailabilityError } from "./availability-errors";
import { getPublicAppointmentAvailability } from "./appointment-availability";
import { isAppointmentSlotSelected } from "./appointment-booking-policy";
import {
  getReceptionAppointmentChangeWindow,
  isReceptionAppointmentActor,
  isReceptionAppointmentChangeAllowed,
  type ReceptionAppointmentChangeReasonCode,
} from "./reception-appointment-change-policy";

type Transaction = Prisma.TransactionClient;

const BLOCKING_APPOINTMENT_STATUSES = [
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
] as const;

function changeError(code: string, message: string, status: number): never {
  throw new AppointmentBookingError(code, message, status);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function isAppointmentConflict(error: unknown): boolean {
  if (isPrismaCode(error, "P2034")) return true;

  const metadata =
    typeof error === "object" && error !== null && "meta" in error &&
    typeof error.meta === "object" && error.meta !== null
      ? error.meta as Record<string, unknown>
      : null;
  const databaseMessage = metadata
    ? [metadata.database_error, metadata.constraint, metadata.code].filter(Boolean).join(" ")
    : "";
  const message = `${error instanceof Error ? error.message : ""} ${databaseMessage}`;

  return /23P01|exclusion constraint|Appointment_(doctor|patient|room)_no_overlap/i.test(message);
}

function revokeGuestManagementTokenHash(): string {
  return createHash("sha256").update(randomBytes(32).toString("base64url"), "utf8").digest("hex");
}

async function assertActiveReceptionEmployee(
  transaction: Transaction,
  actorEmployeeId: string,
): Promise<void> {
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

  if (!employee || !isReceptionAppointmentActor({
    employeeStatus: employee.status,
    activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
  })) {
    changeError(
      "RECEPTION_PERMISSION_REQUIRED",
      "An active Reception employee is required to change this appointment.",
      403,
    );
  }
}

async function lockPatientAppointmentSchedule(
  transaction: Transaction,
  patientId: string,
): Promise<void> {
  const updated = await transaction.$executeRaw`
    UPDATE "Patient"
      SET "appointmentScheduleVersion" = "appointmentScheduleVersion" + 1
      WHERE "id" = ${patientId} AND "isActive" = TRUE
  `;

  if (updated !== 1) {
    changeError("ACTIVE_PATIENT_REQUIRED", "The appointment is not available for Reception changes.", 409);
  }
}

async function lockAppointmentAndGuestContact(
  transaction: Transaction,
  appointmentId: string,
): Promise<void> {
  const appointmentRows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Appointment" WHERE "id" = ${appointmentId} FOR UPDATE
  `;
  if (appointmentRows.length !== 1) {
    changeError("APPOINTMENT_NOT_FOUND", "The appointment could not be found.", 404);
  }

  // Guest token cancellation/rescheduling and Reception guest resolution use
  // Appointment -> GuestAppointmentContact lock order. Keep the same order.
  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "GuestAppointmentContact" WHERE "appointmentId" = ${appointmentId} FOR UPDATE
  `;
}

async function loadLockedReceptionAppointment(
  transaction: Transaction,
  appointmentId: string,
  expectedPatientId: string | null,
) {
  const appointment = await transaction.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      bookingReference: true,
      patientId: true,
      source: true,
      status: true,
      startsAt: true,
      endsAt: true,
      durationMinutes: true,
      cancelledAt: true,
      doctorId: true,
      consultationRoomId: true,
      doctorService: {
        select: {
          serviceId: true,
          durationMinutes: true,
        },
      },
      guestContact: {
        select: {
          id: true,
          resolutionStatus: true,
          resolvedPatientId: true,
          manageTokenHash: true,
        },
      },
    },
  });

  if (!appointment) {
    changeError("APPOINTMENT_NOT_FOUND", "The appointment could not be found.", 404);
  }

  if (appointment.patientId !== expectedPatientId) {
    changeError(
      "APPOINTMENT_STATE_CHANGED",
      "The appointment's patient link changed while the request was being processed. Refresh and try again.",
      409,
    );
  }

  let patientIsActive = false;
  if (appointment.patientId) {
    const patient = await transaction.patient.findUnique({
      where: { id: appointment.patientId },
      select: { isActive: true },
    });
    patientIsActive = patient?.isActive === true;
  }

  const now = new Date();
  if (!isReceptionAppointmentChangeAllowed({
    employeeStatus: "ACTIVE", // The live employee/role check was performed in this transaction.
    activeRoles: ["RECEPTION"],
    source: appointment.source,
    patientId: appointment.patientId,
    patientIsActive,
    status: appointment.status,
    startsAt: appointment.startsAt,
    cancelledAt: appointment.cancelledAt,
    guestContactExists: appointment.guestContact !== null,
    guestResolutionStatus: appointment.guestContact?.resolutionStatus ?? null,
    guestResolvedPatientId: appointment.guestContact?.resolvedPatientId ?? null,
    now,
  })) {
    changeError(
      "APPOINTMENT_NOT_ELIGIBLE_FOR_RECEPTION_CHANGE",
      "Only an upcoming, confirmed appointment with a consistent patient or guest identity can be changed by Reception.",
      409,
    );
  }

  return { appointment, now };
}

export async function cancelReceptionAppointment(
  appointmentId: string,
  reasonCode: ReceptionAppointmentChangeReasonCode,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      await assertActiveReceptionEmployee(transaction, actorEmployeeId);

      const initial = await transaction.appointment.findUnique({
        where: { id: appointmentId },
        select: { patientId: true },
      });
      if (!initial) changeError("APPOINTMENT_NOT_FOUND", "The appointment could not be found.", 404);

      // Match patient self-service lock order: Patient schedule mutex -> Appointment.
      if (initial.patientId) await lockPatientAppointmentSchedule(transaction, initial.patientId);
      await lockAppointmentAndGuestContact(transaction, appointmentId);

      const { appointment, now } = await loadLockedReceptionAppointment(
        transaction,
        appointmentId,
        initial.patientId,
      );
      const changeWindow = getReceptionAppointmentChangeWindow(appointment.startsAt, now);
      if (!changeWindow) {
        changeError("APPOINTMENT_NOT_ELIGIBLE_FOR_RECEPTION_CHANGE", "The appointment is no longer upcoming.", 409);
      }

      const update = await transaction.appointment.updateMany({
        where: {
          id: appointment.id,
          patientId: appointment.patientId,
          status: "CONFIRMED",
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
          cancelledAt: null,
        },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancellationReason: `RECEPTION_CANCELLED|reason=${reasonCode}|window=${changeWindow}`,
        },
      });

      if (update.count !== 1) {
        changeError("APPOINTMENT_STATE_CHANGED", "The appointment changed before cancellation could be completed. Refresh and try again.", 409);
      }

      if (appointment.guestContact?.resolutionStatus === "PENDING_VERIFICATION") {
        const revoked = await transaction.guestAppointmentContact.updateMany({
          where: {
            id: appointment.guestContact.id,
            appointmentId: appointment.id,
            resolutionStatus: "PENDING_VERIFICATION",
            resolvedPatientId: null,
          },
          data: { manageTokenHash: revokeGuestManagementTokenHash() },
        });
        if (revoked.count !== 1) {
          changeError("APPOINTMENT_STATE_CHANGED", "The guest appointment management state changed. Refresh and try again.", 409);
        }
      }

      const historyReason = `RECEPTION_CANCELLED|reason=${reasonCode}|window=${changeWindow}`;
      await transaction.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: "CONFIRMED",
          toStatus: "CANCELLED",
          changeSource: "STAFF",
          changedByEmployeeId: actorEmployeeId,
          reason: historyReason,
          changedAt: now,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "RECEPTION_APPOINTMENT_CANCELLED",
          entityType: "Appointment",
          entityId: appointment.id,
          reason: `Reception cancelled a confirmed appointment; reason=${reasonCode}; window=${changeWindow}. No fee or penalty was applied by this operation.`,
          occurredAt: now,
        },
      });

      return {
        appointmentId: appointment.id,
        bookingReference: appointment.bookingReference,
        status: "CANCELLED" as const,
        cancelledAt: now.toISOString(),
        timing: changeWindow,
        reasonCode,
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isPrismaCode(error, "P2034")) {
      throw new AppointmentBookingError("APPOINTMENT_STATE_CHANGED", "The appointment changed during cancellation. Refresh and try again.", 409);
    }
    throw error;
  }
}

export async function rescheduleReceptionAppointment(
  appointmentId: string,
  requestedStartsAt: Date,
  reasonCode: ReceptionAppointmentChangeReasonCode,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      await assertActiveReceptionEmployee(transaction, actorEmployeeId);

      const initial = await transaction.appointment.findUnique({
        where: { id: appointmentId },
        select: { patientId: true },
      });
      if (!initial) changeError("APPOINTMENT_NOT_FOUND", "The appointment could not be found.", 404);

      // Match patient self-service lock order to serialize patient overlap checks.
      if (initial.patientId) await lockPatientAppointmentSchedule(transaction, initial.patientId);
      await lockAppointmentAndGuestContact(transaction, appointmentId);

      const { appointment, now } = await loadLockedReceptionAppointment(
        transaction,
        appointmentId,
        initial.patientId,
      );
      const changeWindow = getReceptionAppointmentChangeWindow(appointment.startsAt, now);
      if (!changeWindow) {
        changeError("APPOINTMENT_NOT_ELIGIBLE_FOR_RECEPTION_CHANGE", "The appointment is no longer upcoming.", 409);
      }
      if (!Number.isFinite(requestedStartsAt.getTime()) || requestedStartsAt.getTime() <= now.getTime()) {
        changeError("INVALID_TARGET_APPOINTMENT_TIME", "Choose a future appointment time.", 400);
      }
      if (requestedStartsAt.getTime() === appointment.startsAt.getTime()) {
        changeError("APPOINTMENT_TIME_UNCHANGED", "Choose a different appointment time.", 400);
      }

      // Keep the original doctor, service, duration, and price snapshot. A
      // configured duration change requires a separately reviewed workflow.
      if (appointment.doctorService.durationMinutes !== appointment.durationMinutes) {
        changeError("APPOINTMENT_SERVICE_CHANGED", "The configured service duration changed after booking. Reception must review this appointment before moving it.", 409);
      }

      const localDate = toClinicLocalDateTime(requestedStartsAt).localDate;
      let availability: Awaited<ReturnType<typeof getPublicAppointmentAvailability>>;
      try {
        availability = await getPublicAppointmentAvailability({
          doctorId: appointment.doctorId,
          serviceId: appointment.doctorService.serviceId,
          date: localDate,
        }, transaction, { excludeAppointmentId: appointment.id });
      } catch (error) {
        if (error instanceof AppointmentAvailabilityError) {
          changeError("APPOINTMENT_SLOT_UNAVAILABLE", "The selected time is not available for this doctor and service. Refresh availability and choose another time.", 409);
        }
        throw error;
      }

      const selectedSlot = isAppointmentSlotSelected(availability.slots, requestedStartsAt);
      if (!selectedSlot || selectedSlot.endsAt.getTime() - selectedSlot.startsAt.getTime() !== appointment.durationMinutes * 60_000) {
        changeError("APPOINTMENT_SLOT_UNAVAILABLE", "The selected time is not an available slot for this appointment. Refresh availability and choose another time.", 409);
      }

      if (appointment.patientId) {
        const patientOverlap = await transaction.appointment.findFirst({
          where: {
            id: { not: appointment.id },
            patientId: appointment.patientId,
            status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
            startsAt: { lt: selectedSlot.endsAt },
            endsAt: { gt: selectedSlot.startsAt },
          },
          select: { id: true },
        });
        if (patientOverlap) {
          changeError("PATIENT_APPOINTMENT_OVERLAP", "This patient already has another appointment at the selected time. Choose a different time or resolve the conflict through the approved overlap workflow.", 409);
        }
      }

      const activeRooms = await transaction.consultationRoom.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
        select: { id: true },
      });
      let consultationRoomId: string | null = null;
      for (const room of activeRooms) {
        const roomConflict = await transaction.appointment.findFirst({
          where: {
            id: { not: appointment.id },
            consultationRoomId: room.id,
            status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
            startsAt: { lt: selectedSlot.endsAt },
            endsAt: { gt: selectedSlot.startsAt },
          },
          select: { id: true },
        });
        if (!roomConflict) {
          consultationRoomId = room.id;
          break;
        }
      }
      if (activeRooms.length > 0 && consultationRoomId === null) {
        changeError("CONSULTATION_ROOM_UNAVAILABLE", "No consultation room is available at the selected time. Choose another slot.", 409);
      }

      const update = await transaction.appointment.updateMany({
        where: {
          id: appointment.id,
          patientId: appointment.patientId,
          status: "CONFIRMED",
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
          cancelledAt: null,
        },
        data: {
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
          consultationRoomId,
        },
      });
      if (update.count !== 1) {
        changeError("APPOINTMENT_STATE_CHANGED", "The appointment changed before rescheduling could be completed. Refresh and try again.", 409);
      }

      const historyReason = `RECEPTION_RESCHEDULED|reason=${reasonCode}|window=${changeWindow}|from=${appointment.startsAt.toISOString()}|to=${selectedSlot.startsAt.toISOString()}`;
      await transaction.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: "CONFIRMED",
          toStatus: "CONFIRMED",
          changeSource: "STAFF",
          changedByEmployeeId: actorEmployeeId,
          reason: historyReason,
          changedAt: now,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "RECEPTION_APPOINTMENT_RESCHEDULED",
          entityType: "Appointment",
          entityId: appointment.id,
          reason: `Reception moved a confirmed appointment; reason=${reasonCode}; window=${changeWindow}. Doctor, service, duration, and booked price were preserved.`,
          occurredAt: now,
        },
      });

      const localStart = toClinicLocalDateTime(selectedSlot.startsAt);
      const localEnd = toClinicLocalDateTime(selectedSlot.endsAt);
      return {
        appointmentId: appointment.id,
        bookingReference: appointment.bookingReference,
        status: "CONFIRMED" as const,
        reasonCode,
        timing: changeWindow,
        previousStartsAt: appointment.startsAt.toISOString(),
        previousEndsAt: appointment.endsAt.toISOString(),
        startsAt: selectedSlot.startsAt.toISOString(),
        endsAt: selectedSlot.endsAt.toISOString(),
        localDate: localStart.localDate,
        startTime: localStart.localTime,
        endTime: localEnd.localTime,
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isAppointmentConflict(error)) {
      throw new AppointmentBookingError("APPOINTMENT_SLOT_UNAVAILABLE", "The selected time or room was booked by another request. Refresh availability and choose another time.", 409);
    }
    throw error;
  }
}
