import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { AppointmentBookingError } from "./appointment-booking-errors";
import {
  isReceptionAppointmentEligibleForNoShow,
  isReceptionNoShowActor,
  RECEPTION_NO_SHOW_GRACE_PERIOD_MINUTES,
  RECEPTION_NO_SHOW_GRACE_PERIOD_MS,
} from "./reception-appointment-no-show-policy";

type Transaction = Prisma.TransactionClient;

function noShowError(code: string, message: string, status: number): never {
  throw new AppointmentBookingError(code, message, status);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function revokeGuestManagementTokenHash(): string {
  // Replace the bearer-token hash with a hash for an unreachable random token.
  // The raw token is never generated for or returned to the caller.
  return createHash("sha256")
    .update(randomBytes(32).toString("base64url"), "utf8")
    .digest("hex");
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

  if (!employee || !isReceptionNoShowActor({
    employeeStatus: employee.status,
    activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
  })) {
    noShowError(
      "RECEPTION_PERMISSION_REQUIRED",
      "An active Reception employee is required to record an appointment no-show.",
      403,
    );
  }
}

/**
 * Serialize no-show against check-in, guest token management and Reception
 * guest resolution. Use the same Appointment -> GuestAppointmentContact lock
 * order as those operations.
 */
async function lockAppointmentAndGuestContact(
  transaction: Transaction,
  appointmentId: string,
): Promise<void> {
  const appointmentRows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Appointment" WHERE "id" = ${appointmentId} FOR UPDATE
  `;
  if (appointmentRows.length !== 1) {
    noShowError("APPOINTMENT_NOT_FOUND", "The appointment could not be found.", 404);
  }

  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "GuestAppointmentContact" WHERE "appointmentId" = ${appointmentId} FOR UPDATE
  `;
}

/**
 * Record an explicit Reception no-show for an unarrived confirmed appointment.
 * This does not run automatically and does not create a fee or penalty.
 */
export async function markReceptionAppointmentNoShow(
  appointmentId: string,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      await assertActiveReceptionEmployee(transaction, actorEmployeeId);
      await lockAppointmentAndGuestContact(transaction, appointmentId);

      const appointment = await transaction.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          bookingReference: true,
          patientId: true,
          source: true,
          status: true,
          startsAt: true,
          checkedInAt: true,
          cancelledAt: true,
          completedAt: true,
          queueEntry: { select: { id: true } },
          guestContact: {
            select: {
              id: true,
              resolutionStatus: true,
              resolvedPatientId: true,
            },
          },
        },
      });

      if (!appointment) {
        noShowError("APPOINTMENT_NOT_FOUND", "The appointment could not be found.", 404);
      }

      const now = new Date();
      if (now.getTime() - appointment.startsAt.getTime() <= RECEPTION_NO_SHOW_GRACE_PERIOD_MS) {
        noShowError(
          "NO_SHOW_GRACE_PERIOD_ACTIVE",
          "The 10-minute grace period has not fully elapsed. Do not mark the appointment as no-show yet.",
          409,
        );
      }

      if (appointment.checkedInAt !== null || appointment.queueEntry !== null) {
        noShowError(
          "APPOINTMENT_ALREADY_CHECKED_IN",
          "An appointment that has been checked in or entered the queue cannot be marked as no-show.",
          409,
        );
      }

      const guestContactExists = appointment.guestContact !== null;
      const guestResolutionStatus = appointment.guestContact?.resolutionStatus ?? null;
      const guestResolvedPatientId = appointment.guestContact?.resolvedPatientId ?? null;

      if (!isReceptionAppointmentEligibleForNoShow({
        employeeStatus: "ACTIVE", // Active employee and role were rechecked in this transaction.
        activeRoles: ["RECEPTION"],
        source: appointment.source,
        patientId: appointment.patientId,
        status: appointment.status,
        startsAt: appointment.startsAt,
        checkedInAt: appointment.checkedInAt,
        cancelledAt: appointment.cancelledAt,
        completedAt: appointment.completedAt,
        queueEntryExists: appointment.queueEntry !== null,
        guestContactExists,
        guestResolutionStatus,
        guestResolvedPatientId,
        now,
      })) {
        noShowError(
          "APPOINTMENT_NOT_ELIGIBLE_FOR_NO_SHOW",
          "Only an unarrived, confirmed appointment with a consistent patient or guest identity can be marked as no-show.",
          409,
        );
      }

      const appointmentUpdate = await transaction.appointment.updateMany({
        where: {
          id: appointment.id,
          status: "CONFIRMED",
          startsAt: appointment.startsAt,
          checkedInAt: null,
          cancelledAt: null,
          completedAt: null,
        },
        data: { status: "NO_SHOW" },
      });

      if (appointmentUpdate.count !== 1) {
        noShowError(
          "APPOINTMENT_STATE_CHANGED",
          "The appointment changed before the no-show could be recorded. Refresh and try again.",
          409,
        );
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
          noShowError(
            "APPOINTMENT_STATE_CHANGED",
            "The guest appointment management state changed before the no-show could be completed. Refresh and try again.",
            409,
          );
        }
      }

      const historyReason = `RECEPTION_NO_SHOW|gracePeriodMinutes=${RECEPTION_NO_SHOW_GRACE_PERIOD_MINUTES}`;
      await transaction.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: "CONFIRMED",
          toStatus: "NO_SHOW",
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
          action: "RECEPTION_APPOINTMENT_MARKED_NO_SHOW",
          entityType: "Appointment",
          entityId: appointment.id,
          reason: `Reception explicitly recorded that the patient did not arrive after the inclusive ${RECEPTION_NO_SHOW_GRACE_PERIOD_MINUTES}-minute grace period. No automatic cancellation, fee, or penalty was applied. No patient or guest contact details were copied to the audit record.`,
          occurredAt: now,
        },
      });

      return {
        appointmentId: appointment.id,
        bookingReference: appointment.bookingReference,
        status: "NO_SHOW" as const,
        recordedAt: now.toISOString(),
        gracePeriodMinutes: RECEPTION_NO_SHOW_GRACE_PERIOD_MINUTES,
        guestManagementTokenRevoked:
          appointment.guestContact?.resolutionStatus === "PENDING_VERIFICATION",
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isPrismaCode(error, "P2034")) {
      noShowError(
        "APPOINTMENT_STATE_CHANGED",
        "The appointment changed while the no-show was being recorded. Refresh and try again.",
        409,
      );
    }
    throw error;
  }
}
