import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { toClinicLocalDateTime } from "../../lib/clinic-time";
import { getPrismaClient } from "../db/client";
import { isPatientDelegationAllowed } from "../auth/authorization/delegation-policy";
import { AppointmentBookingError } from "./appointment-booking-errors";
import { AppointmentAvailabilityError } from "./availability-errors";
import { getPublicAppointmentAvailability } from "./appointment-availability";
import { isAppointmentSlotSelected } from "./appointment-booking-policy";
import {
  isPatientSelfReschedulingAllowed,
} from "./patient-appointment-rescheduling-policy";

type Transaction = Prisma.TransactionClient;

const BLOCKING_APPOINTMENT_STATUSES = [
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
] as const;

function reschedulingError(code: string, message: string, status: number): never {
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

  return /23P01|exclusion constraint|Appointment_(doctor|room)_no_overlap/i.test(message);
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
    reschedulingError(
      "ACTIVE_PATIENT_REQUIRED",
      "The appointment is not available for patient self-service.",
      404,
    );
  }
}

async function assertAppointmentManagementAuthority(
  transaction: Transaction,
  actorPatientId: string,
  subjectPatientId: string,
  now: Date,
): Promise<void> {
  const [actor, subject] = await Promise.all([
    transaction.patient.findUnique({
      where: { id: actorPatientId },
      select: { id: true, isActive: true },
    }),
    transaction.patient.findUnique({
      where: { id: subjectPatientId },
      select: { id: true, isActive: true, dateOfBirth: true },
    }),
  ]);

  if (!actor?.isActive || !subject?.isActive) {
    reschedulingError(
      "PATIENT_ACCESS_DENIED",
      "Access to this appointment is not permitted.",
      403,
    );
  }

  if (actorPatientId === subjectPatientId) return;

  const grant = await transaction.patientAccessGrant.findUnique({
    where: {
      subjectPatientId_granteePatientId: {
        subjectPatientId,
        granteePatientId: actorPatientId,
      },
    },
    select: {
      status: true,
      verifiedAt: true,
      verifiedByEmployeeId: true,
      expiresAt: true,
      revokedAt: true,
      approvedByPatientId: true,
      approvedAt: true,
      relationship: {
        select: {
          isActive: true,
          isLegalGuardian: true,
          guardianVerifiedAt: true,
          guardianVerifiedByEmployeeId: true,
        },
      },
      permissions: { select: { scope: true } },
    },
  });

  const allowed = grant !== null && isPatientDelegationAllowed({
    subjectPatientId,
    requiredScope: "MANAGE_APPOINTMENTS",
    grantedScopes: grant.permissions.map((permission) => permission.scope),
    grantStatus: grant.status,
    grantVerifiedAt: grant.verifiedAt,
    grantVerifiedByEmployeeId: grant.verifiedByEmployeeId,
    grantExpiresAt: grant.expiresAt,
    grantRevokedAt: grant.revokedAt,
    approvedByPatientId: grant.approvedByPatientId,
    approvedAt: grant.approvedAt,
    subjectDateOfBirth: subject.dateOfBirth,
    relationshipIsActive: grant.relationship.isActive,
    relationshipIsLegalGuardian: grant.relationship.isLegalGuardian,
    relationshipGuardianVerifiedAt: grant.relationship.guardianVerifiedAt,
    relationshipGuardianVerifiedByEmployeeId: grant.relationship.guardianVerifiedByEmployeeId,
    now,
  });

  if (!allowed) {
    reschedulingError(
      "APPOINTMENT_MANAGEMENT_SCOPE_REQUIRED",
      "You do not have permission to manage appointments for this patient.",
      403,
    );
  }
}

async function reschedulePatientAppointmentInTransaction(
  transaction: Transaction,
  appointmentId: string,
  requestedStartsAt: Date,
  actorPatientId: string,
) {
  const initialAppointment = await transaction.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, patientId: true },
  });

  if (!initialAppointment?.patientId) {
    reschedulingError(
      "APPOINTMENT_NOT_FOUND",
      "The appointment was not found or is not available for patient self-service.",
      404,
    );
  }

  const subjectPatientId = initialAppointment.patientId;
  await lockPatientAppointmentSchedule(transaction, subjectPatientId);

  // Re-read after the per-patient schedule mutex. Concurrent Reception changes
  // or another patient action must not be overwritten using stale appointment data.
  const appointment = await transaction.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      bookingReference: true,
      patientId: true,
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

  if (!appointment || appointment.patientId !== subjectPatientId) {
    reschedulingError(
      "APPOINTMENT_NOT_FOUND",
      "The appointment was not found or is not available for patient self-service.",
      404,
    );
  }

  const now = new Date();
  await assertAppointmentManagementAuthority(
    transaction,
    actorPatientId,
    subjectPatientId,
    now,
  );

  if (appointment.cancelledAt !== null || appointment.status !== "CONFIRMED") {
    reschedulingError(
      "APPOINTMENT_CANNOT_BE_RESCHEDULED",
      "Only a confirmed appointment can be rescheduled through patient self-service.",
      409,
    );
  }

  if (!isPatientSelfReschedulingAllowed({
    patientId: appointment.patientId,
    status: appointment.status,
    currentStartsAt: appointment.startsAt,
    requestedStartsAt,
    now,
  })) {
    reschedulingError(
      "SELF_SERVICE_RESCHEDULING_WINDOW_CLOSED",
      "Self-service rescheduling is available at least 24 hours before the existing appointment. Contact Reception to review a later change.",
      409,
    );
  }

  // Keep the booked doctor, service, duration and price snapshot unchanged.
  // If the configured duration has since changed, Reception must review it.
  if (appointment.doctorService.durationMinutes !== appointment.durationMinutes) {
    reschedulingError(
      "APPOINTMENT_SERVICE_CHANGED",
      "The service duration has changed since this appointment was booked. Contact Reception to reschedule it.",
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
      reschedulingError(
        "APPOINTMENT_SLOT_UNAVAILABLE",
        "The selected time is no longer available for this doctor and service. Refresh availability and choose another time.",
        409,
      );
    }
    throw error;
  }

  const selectedSlot = isAppointmentSlotSelected(availability.slots, requestedStartsAt);
  if (!selectedSlot ||
      selectedSlot.endsAt.getTime() - selectedSlot.startsAt.getTime() !== appointment.durationMinutes * 60_000) {
    reschedulingError(
      "APPOINTMENT_SLOT_UNAVAILABLE",
      "The selected time is not an available slot for this appointment. Refresh availability and choose another time.",
      409,
    );
  }

  const patientOverlap = await transaction.appointment.findFirst({
    where: {
      id: { not: appointment.id },
      patientId: subjectPatientId,
      status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
      startsAt: { lt: selectedSlot.endsAt },
      endsAt: { gt: selectedSlot.startsAt },
    },
    select: { id: true },
  });

  if (patientOverlap) {
    reschedulingError(
      "PATIENT_APPOINTMENT_OVERLAP",
      "This patient already has another appointment at the selected time. Choose a different time or contact Reception.",
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
    reschedulingError(
      "CONSULTATION_ROOM_UNAVAILABLE",
      "No consultation room is available for the selected time. Choose another slot.",
      409,
    );
  }

  const changed = await transaction.appointment.updateMany({
    where: {
      id: appointment.id,
      patientId: subjectPatientId,
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
    reschedulingError(
      "APPOINTMENT_STATE_CHANGED",
      "The appointment changed before rescheduling could be completed. Refresh and try again.",
      409,
    );
  }

  await transaction.appointmentStatusHistory.create({
    data: {
      appointmentId: appointment.id,
      fromStatus: "CONFIRMED",
      toStatus: "CONFIRMED",
      changeSource: "PATIENT",
      changedByPatientId: actorPatientId,
      reason: `PATIENT_RESCHEDULED|from=${appointment.startsAt.toISOString()}|to=${selectedSlot.startsAt.toISOString()}`,
      changedAt: now,
    },
  });

  const localStart = toClinicLocalDateTime(selectedSlot.startsAt);
  const localEnd = toClinicLocalDateTime(selectedSlot.endsAt);

  return {
    appointmentId: appointment.id,
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

/**
 * Patient self-service rescheduling for Patient-linked confirmed appointments.
 * A delegated actor must hold exact MANAGE_APPOINTMENTS authority. Doctor,
 * service, duration, and booked-price snapshots remain unchanged.
 */
export async function reschedulePatientAppointment(
  appointmentId: string,
  requestedStartsAt: Date,
  actorPatientId: string,
) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(
      (transaction: Transaction) =>
        reschedulePatientAppointmentInTransaction(
          transaction,
          appointmentId,
          requestedStartsAt,
          actorPatientId,
        ),
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;

    if (isAppointmentConflict(error)) {
      throw new AppointmentBookingError(
        "APPOINTMENT_SLOT_UNAVAILABLE",
        "The selected time or room was booked by another request. Refresh availability and choose another time.",
        409,
      );
    }

    throw error;
  }
}
