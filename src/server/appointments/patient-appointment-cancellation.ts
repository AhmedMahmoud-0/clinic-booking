import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { isPatientDelegationAllowed } from "../auth/authorization/delegation-policy";
import { AppointmentBookingError } from "./appointment-booking-errors";
import {
  isPatientSelfCancellationAllowed,
  PATIENT_REQUESTED_CANCELLATION_REASON,
} from "./patient-appointment-cancellation-policy";

type Transaction = Prisma.TransactionClient;

function cancellationError(code: string, message: string, status: number): never {
  throw new AppointmentBookingError(code, message, status);
}

/**
 * Serialize a cancellation with booking/rescheduling writes for the same
 * Patient. The database trigger uses the same per-patient schedule version as
 * its write mutex, so the cancellation releases its slot atomically.
 */
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
    cancellationError(
      "ACTIVE_PATIENT_REQUIRED",
      "The appointment is not available for patient self-service.",
      404,
    );
  }
}

/**
 * Recheck exact appointment-management authority inside the transaction.
 * Booking permission alone is deliberately insufficient for cancellation.
 */
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
    cancellationError(
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
    relationshipGuardianVerifiedByEmployeeId:
      grant.relationship.guardianVerifiedByEmployeeId,
    now,
  });

  if (!allowed) {
    cancellationError(
      "APPOINTMENT_MANAGEMENT_SCOPE_REQUIRED",
      "You do not have permission to manage appointments for this patient.",
      403,
    );
  }
}

async function cancelPatientAppointmentInTransaction(
  transaction: Transaction,
  appointmentId: string,
  actorPatientId: string,
) {
  const initialAppointment = await transaction.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, patientId: true },
  });

  // Do not expose whether a public guest appointment exists or is linked.
  if (!initialAppointment?.patientId) {
    cancellationError(
      "APPOINTMENT_NOT_FOUND",
      "The appointment was not found or is not available for patient self-service.",
      404,
    );
  }

  const subjectPatientId = initialAppointment.patientId;
  await lockPatientAppointmentSchedule(transaction, subjectPatientId);

  // Re-read after the per-patient mutex. A concurrent Reception action may
  // have changed the appointment state while this transaction was waiting.
  const appointment = await transaction.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      bookingReference: true,
      patientId: true,
      status: true,
      startsAt: true,
      cancelledAt: true,
    },
  });

  if (!appointment || appointment.patientId !== subjectPatientId) {
    cancellationError(
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

  if (appointment.status !== "CONFIRMED" || appointment.cancelledAt !== null) {
    cancellationError(
      "APPOINTMENT_CANNOT_BE_CANCELLED",
      "Only a confirmed appointment can be cancelled through patient self-service.",
      409,
    );
  }

  if (!isPatientSelfCancellationAllowed({
    patientId: appointment.patientId,
    status: appointment.status,
    startsAt: appointment.startsAt,
    now,
  })) {
    cancellationError(
      "SELF_SERVICE_CANCELLATION_WINDOW_CLOSED",
      "Self-service cancellation is available at least 24 hours before the appointment. Contact Reception to review a later change.",
      409,
    );
  }

  const changed = await transaction.appointment.updateMany({
    where: {
      id: appointment.id,
      patientId: subjectPatientId,
      status: "CONFIRMED",
      startsAt: appointment.startsAt,
      cancelledAt: null,
    },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      cancellationReason: PATIENT_REQUESTED_CANCELLATION_REASON,
    },
  });

  if (changed.count !== 1) {
    cancellationError(
      "APPOINTMENT_STATE_CHANGED",
      "The appointment changed before cancellation could be completed. Refresh and try again.",
      409,
    );
  }

  await transaction.appointmentStatusHistory.create({
    data: {
      appointmentId: appointment.id,
      fromStatus: "CONFIRMED",
      toStatus: "CANCELLED",
      changeSource: "PATIENT",
      changedByPatientId: actorPatientId,
      reason: PATIENT_REQUESTED_CANCELLATION_REASON,
      changedAt: now,
    },
  });

  return {
    appointmentId: appointment.id,
    bookingReference: appointment.bookingReference,
    status: "CANCELLED" as const,
    cancelledAt: now.toISOString(),
  };
}

/**
 * Patient self-service cancellation for a linked appointment. A delegated
 * actor must hold the exact MANAGE_APPOINTMENTS scope; BOOK_APPOINTMENTS alone
 * never grants cancellation authority.
 */
export async function cancelPatientAppointment(
  appointmentId: string,
  actorPatientId: string,
) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(
      (transaction: Transaction) =>
        cancelPatientAppointmentInTransaction(transaction, appointmentId, actorPatientId),
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;

    if (
      typeof error === "object" && error !== null &&
      "code" in error && error.code === "P2034"
    ) {
      throw new AppointmentBookingError(
        "APPOINTMENT_STATE_CHANGED",
        "The appointment changed while cancellation was being processed. Refresh and try again.",
        409,
      );
    }

    throw error;
  }
}
