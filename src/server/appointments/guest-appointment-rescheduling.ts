import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { toClinicLocalDateTime } from "../../lib/clinic-time";
import { getPrismaClient } from "../db/client";
import { AppointmentBookingError } from "./appointment-booking-errors";
import { AppointmentAvailabilityError } from "./availability-errors";
import { getPublicAppointmentAvailability } from "./appointment-availability";
import { isAppointmentSlotSelected } from "./appointment-booking-policy";
import {
  GUEST_SELF_SERVICE_RESCHEDULING_WINDOW_MS,
  isGuestSelfServiceReschedulingAllowed,
} from "./guest-appointment-rescheduling-policy";

type Transaction = Prisma.TransactionClient;

const BLOCKING_APPOINTMENT_STATUSES = [
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
] as const;

function guestReschedulingError(code: string, message: string, status: number): never {
  throw new AppointmentBookingError(code, message, status);
}

function hashGuestManagementToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
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

  return /23P01|exclusion constraint|Appointment_(doctor|room)_no_overlap/i.test(message);
}

async function rescheduleGuestAppointmentInTransaction(
  transaction: Transaction,
  managementToken: string,
  requestedStartsAt: Date,
) {
  const tokenHash = hashGuestManagementToken(managementToken);
  const tokenRecord = await transaction.guestAppointmentContact.findUnique({
    where: { manageTokenHash: tokenHash },
    select: { id: true, appointmentId: true },
  });

  if (!tokenRecord) {
    guestReschedulingError(
      "GUEST_APPOINTMENT_NOT_FOUND",
      "The guest appointment was not found or is no longer available for guest self-service.",
      404,
    );
  }

  // Use the same lock order as guest cancellation and Reception identity
  // resolution: Appointment first, then GuestAppointmentContact.
  const lockedAppointment = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
      FROM "Appointment"
      WHERE "id" = ${tokenRecord.appointmentId}
      FOR UPDATE
  `;

  if (lockedAppointment.length !== 1) {
    guestReschedulingError(
      "GUEST_APPOINTMENT_NOT_FOUND",
      "The guest appointment was not found or is no longer available for guest self-service.",
      404,
    );
  }

  const lockedGuestContact = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
      FROM "GuestAppointmentContact"
      WHERE "id" = ${tokenRecord.id}
      FOR UPDATE
  `;

  if (lockedGuestContact.length !== 1) {
    guestReschedulingError(
      "GUEST_APPOINTMENT_NOT_FOUND",
      "The guest appointment was not found or is no longer available for guest self-service.",
      404,
    );
  }

  // Re-read only after both locks. Linking or cancellation revokes the token;
  // the old hash must not retain management authority after either operation.
  const guestContact = await transaction.guestAppointmentContact.findFirst({
    where: {
      id: tokenRecord.id,
      appointmentId: tokenRecord.appointmentId,
      manageTokenHash: tokenHash,
    },
    select: {
      id: true,
      resolutionStatus: true,
      resolvedPatientId: true,
    },
  });

  if (!guestContact) {
    guestReschedulingError(
      "GUEST_APPOINTMENT_NOT_FOUND",
      "The guest appointment was not found or is no longer available for guest self-service.",
      404,
    );
  }

  const appointment = await transaction.appointment.findUnique({
    where: { id: tokenRecord.appointmentId },
    select: {
      id: true,
      bookingReference: true,
      patientId: true,
      source: true,
      doctorId: true,
      status: true,
      startsAt: true,
      endsAt: true,
      durationMinutes: true,
      cancelledAt: true,
      doctorService: {
        select: { serviceId: true, durationMinutes: true },
      },
    },
  });

  if (!appointment) {
    guestReschedulingError(
      "GUEST_APPOINTMENT_NOT_FOUND",
      "The guest appointment was not found or is no longer available for guest self-service.",
      404,
    );
  }

  const now = new Date();
  const commonEligibility =
    appointment.source === "PUBLIC_WEBSITE" &&
    appointment.patientId === null &&
    appointment.status === "CONFIRMED" &&
    appointment.cancelledAt === null &&
    guestContact.resolutionStatus === "PENDING_VERIFICATION" &&
    guestContact.resolvedPatientId === null;

  if (commonEligibility &&
      appointment.startsAt.getTime() - now.getTime() < GUEST_SELF_SERVICE_RESCHEDULING_WINDOW_MS) {
    guestReschedulingError(
      "GUEST_SELF_SERVICE_RESCHEDULING_WINDOW_CLOSED",
      "Guest self-service rescheduling is available at least 24 hours before the existing appointment. Contact Reception to review a later change.",
      409,
    );
  }

  if (!isGuestSelfServiceReschedulingAllowed({
    source: appointment.source,
    patientId: appointment.patientId,
    status: appointment.status,
    currentStartsAt: appointment.startsAt,
    requestedStartsAt,
    cancelledAt: appointment.cancelledAt,
    resolutionStatus: guestContact.resolutionStatus,
    resolvedPatientId: guestContact.resolvedPatientId,
    now,
  })) {
    guestReschedulingError(
      "GUEST_APPOINTMENT_CANNOT_BE_RESCHEDULED",
      "Only an unresolved, confirmed public guest appointment can be rescheduled through guest self-service to a different future slot.",
      409,
    );
  }

  // Keep the original doctor, service, duration, and booked-price snapshot.
  // If the service duration has changed since booking, Reception must review it.
  if (appointment.doctorService.durationMinutes !== appointment.durationMinutes) {
    guestReschedulingError(
      "GUEST_APPOINTMENT_SERVICE_CHANGED",
      "The booked service duration has changed since this appointment was created. Contact Reception to reschedule it.",
      409,
    );
  }

  const localDate = toClinicLocalDateTime(requestedStartsAt).localDate;
  let availability: Awaited<ReturnType<typeof getPublicAppointmentAvailability>>;
  try {
    availability = await getPublicAppointmentAvailability(
      {
        doctorId: appointment.doctorId,
        serviceId: appointment.doctorService.serviceId,
        date: localDate,
      },
      transaction,
      { excludeAppointmentId: appointment.id },
    );
  } catch (error) {
    if (error instanceof AppointmentAvailabilityError) {
      guestReschedulingError(
        "GUEST_APPOINTMENT_SLOT_UNAVAILABLE",
        "The selected time is no longer available for this doctor and service. Refresh availability and choose another time.",
        409,
      );
    }
    throw error;
  }

  const selectedSlot = isAppointmentSlotSelected(availability.slots, requestedStartsAt);
  if (!selectedSlot ||
      selectedSlot.endsAt.getTime() - selectedSlot.startsAt.getTime() !== appointment.durationMinutes * 60_000) {
    guestReschedulingError(
      "GUEST_APPOINTMENT_SLOT_UNAVAILABLE",
      "The selected time is not an available slot for this appointment. Refresh availability and choose another time.",
      409,
    );
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
    guestReschedulingError(
      "GUEST_APPOINTMENT_ROOM_UNAVAILABLE",
      "No consultation room is available for the selected time. Choose another slot.",
      409,
    );
  }

  const changed = await transaction.appointment.updateMany({
    where: {
      id: appointment.id,
      source: "PUBLIC_WEBSITE",
      patientId: null,
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

  if (changed.count !== 1) {
    guestReschedulingError(
      "GUEST_APPOINTMENT_STATE_CHANGED",
      "The guest appointment changed before rescheduling could be completed. Refresh and try again.",
      409,
    );
  }

  const historyReason =
    `GUEST_RESCHEDULED|from=${appointment.startsAt.toISOString()}|to=${selectedSlot.startsAt.toISOString()}`;

  await transaction.appointmentStatusHistory.create({
    data: {
      appointmentId: appointment.id,
      fromStatus: "CONFIRMED",
      toStatus: "CONFIRMED",
      changeSource: "SYSTEM",
      reason: historyReason,
      changedAt: now,
    },
  });

  await transaction.auditLog.create({
    data: {
      actorType: "EXTERNAL",
      action: "GUEST_APPOINTMENT_RESCHEDULED",
      entityType: "Appointment",
      entityId: appointment.id,
      reason: "A public guest moved a confirmed appointment using its hashed bearer management token. The token remains valid for this unresolved booking; guest contact details and token values were not retained.",
      occurredAt: now,
    },
  });

  const localStart = toClinicLocalDateTime(selectedSlot.startsAt);
  const localEnd = toClinicLocalDateTime(selectedSlot.endsAt);

  return {
    bookingReference: appointment.bookingReference,
    status: "CONFIRMED" as const,
    previousStartsAt: appointment.startsAt.toISOString(),
    previousEndsAt: appointment.endsAt.toISOString(),
    startsAt: selectedSlot.startsAt.toISOString(),
    endsAt: selectedSlot.endsAt.toISOString(),
    localDate: localStart.localDate,
    startTime: localStart.localTime,
    endTime: localEnd.localTime,
  };
}

/** Reschedule an unresolved public guest appointment with its hashed bearer token. */
export async function rescheduleGuestAppointment(
  managementToken: string,
  requestedStartsAt: Date,
) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(
      (transaction: Transaction) =>
        rescheduleGuestAppointmentInTransaction(
          transaction,
          managementToken,
          requestedStartsAt,
        ),
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;

    if (isAppointmentConflict(error)) {
      throw new AppointmentBookingError(
        "GUEST_APPOINTMENT_SLOT_UNAVAILABLE",
        "The selected time or room was booked by another request. Refresh availability and choose another time.",
        409,
      );
    }

    throw error;
  }
}
