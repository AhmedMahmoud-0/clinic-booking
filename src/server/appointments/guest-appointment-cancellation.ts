import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { AppointmentBookingError } from "./appointment-booking-errors";
import {
  GUEST_REQUESTED_CANCELLATION_REASON,
  GUEST_SELF_SERVICE_CANCELLATION_WINDOW_MS,
  isGuestSelfServiceCancellationAllowed,
} from "./guest-appointment-cancellation-policy";

type Transaction = Prisma.TransactionClient;

function guestCancellationError(code: string, message: string, status: number): never {
  throw new AppointmentBookingError(code, message, status);
}

function hashGuestManagementToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function revokeGuestManagementTokenHash(): string {
  // Persist only a hash for an unreachable random token after successful use.
  return hashGuestManagementToken(randomBytes(32).toString("base64url"));
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function cancelGuestAppointmentInTransaction(
  transaction: Transaction,
  managementToken: string,
) {
  const tokenHash = hashGuestManagementToken(managementToken);
  const tokenRecord = await transaction.guestAppointmentContact.findUnique({
    where: { manageTokenHash: tokenHash },
    select: { id: true, appointmentId: true },
  });

  if (!tokenRecord) {
    guestCancellationError(
      "GUEST_APPOINTMENT_NOT_FOUND",
      "The guest appointment was not found or is no longer available for guest self-service.",
      404,
    );
  }

  // Lock rows in the same order used by guest-to-Patient resolution. This
  // serializes cancellation against concurrent token use and Reception linking.
  const lockedAppointment = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
      FROM "Appointment"
      WHERE "id" = ${tokenRecord.appointmentId}
      FOR UPDATE
  `;

  if (lockedAppointment.length !== 1) {
    guestCancellationError(
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
    guestCancellationError(
      "GUEST_APPOINTMENT_NOT_FOUND",
      "The guest appointment was not found or is no longer available for guest self-service.",
      404,
    );
  }

  // Re-read only after acquiring both locks. A resolved or already-cancelled
  // token must not retain any guest-management authority.
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
    guestCancellationError(
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
      status: true,
      startsAt: true,
      cancelledAt: true,
    },
  });

  if (!appointment) {
    guestCancellationError(
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
      appointment.startsAt.getTime() - now.getTime() < GUEST_SELF_SERVICE_CANCELLATION_WINDOW_MS) {
    guestCancellationError(
      "GUEST_SELF_SERVICE_CANCELLATION_WINDOW_CLOSED",
      "Guest self-service cancellation is available at least 24 hours before the appointment. Contact Reception to review a later change.",
      409,
    );
  }

  if (!isGuestSelfServiceCancellationAllowed({
    source: appointment.source,
    patientId: appointment.patientId,
    status: appointment.status,
    startsAt: appointment.startsAt,
    cancelledAt: appointment.cancelledAt,
    resolutionStatus: guestContact.resolutionStatus,
    resolvedPatientId: guestContact.resolvedPatientId,
    now,
  })) {
    guestCancellationError(
      "GUEST_APPOINTMENT_CANNOT_BE_CANCELLED",
      "Only an unresolved, confirmed public guest appointment can be cancelled through guest self-service.",
      409,
    );
  }

  const appointmentUpdate = await transaction.appointment.updateMany({
    where: {
      id: appointment.id,
      source: "PUBLIC_WEBSITE",
      patientId: null,
      status: "CONFIRMED",
      startsAt: appointment.startsAt,
      cancelledAt: null,
    },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      cancellationReason: GUEST_REQUESTED_CANCELLATION_REASON,
    },
  });

  if (appointmentUpdate.count !== 1) {
    guestCancellationError(
      "GUEST_APPOINTMENT_STATE_CHANGED",
      "The guest appointment changed before cancellation could be completed. Refresh and try again.",
      409,
    );
  }

  const guestUpdate = await transaction.guestAppointmentContact.updateMany({
    where: {
      id: guestContact.id,
      appointmentId: appointment.id,
      manageTokenHash: tokenHash,
      resolutionStatus: "PENDING_VERIFICATION",
      resolvedPatientId: null,
    },
    data: { manageTokenHash: revokeGuestManagementTokenHash() },
  });

  if (guestUpdate.count !== 1) {
    guestCancellationError(
      "GUEST_APPOINTMENT_STATE_CHANGED",
      "The guest appointment changed before cancellation could be completed. Refresh and try again.",
      409,
    );
  }

  await transaction.appointmentStatusHistory.create({
    data: {
      appointmentId: appointment.id,
      fromStatus: "CONFIRMED",
      toStatus: "CANCELLED",
      changeSource: "SYSTEM",
      reason: GUEST_REQUESTED_CANCELLATION_REASON,
      changedAt: now,
    },
  });

  // The history schema has no guest actor type; the lifecycle row is SYSTEM
  // attributed, while the audit event records the originating actor as EXTERNAL.
  // Neither record contains the bearer token or guest contact information.
  await transaction.auditLog.create({
    data: {
      actorType: "EXTERNAL",
      action: "GUEST_APPOINTMENT_CANCELLED",
      entityType: "Appointment",
      entityId: appointment.id,
      reason: "A public guest cancelled a confirmed appointment using its hashed bearer management token. The token was invalidated; guest contact details and token values were not retained.",
      occurredAt: now,
    },
  });

  return {
    bookingReference: appointment.bookingReference,
    status: "CANCELLED" as const,
    cancelledAt: now.toISOString(),
  };
}

/** Cancel an unresolved public guest appointment with its high-entropy bearer token. */
export async function cancelGuestAppointment(managementToken: string) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(
      (transaction: Transaction) =>
        cancelGuestAppointmentInTransaction(transaction, managementToken),
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;

    if (isPrismaCode(error, "P2034")) {
      throw new AppointmentBookingError(
        "GUEST_APPOINTMENT_STATE_CHANGED",
        "The guest appointment changed while cancellation was being processed. Refresh and try again.",
        409,
      );
    }

    throw error;
  }
}
