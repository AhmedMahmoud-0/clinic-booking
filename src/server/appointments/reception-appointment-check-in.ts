import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { toClinicLocalDateTime } from "../../lib/clinic-time";
import { getPrismaClient } from "../db/client";
import {
  verifyPatientIdentityMatch,
  type PatientIdentityVerificationRecord,
  type PatientIdentityVerificationInput,
} from "../patient-management/identity-verification-validation";
import { AppointmentBookingError } from "./appointment-booking-errors";
import { allocateNextDoctorQueueNumber } from "./doctor-queue-number";
import {
  getReceptionArrivalDecision,
  isReceptionAppointmentEligibleForCheckIn,
  isReceptionCheckInActor,
} from "./reception-appointment-check-in-policy";

type Transaction = Prisma.TransactionClient;

type CheckInTransactionResult =
  | { outcome: "IDENTITY_MISMATCH"; verificationId: string }
  | {
      outcome: "CHECKED_IN";
      appointmentId: string;
      queueEntryId: string;
      queueNumber: number;
      queueDate: string;
      appointmentStatus: "CHECKED_IN";
      queueStatus: "WAITING";
      checkedInAt: string;
      arrival: string;
    };

function checkInError(code: string, message: string, status: number): never {
  throw new AppointmentBookingError(code, message, status);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
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

  if (!employee || !isReceptionCheckInActor({
    employeeStatus: employee.status,
    activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
  })) {
    checkInError(
      "RECEPTION_PERMISSION_REQUIRED",
      "An active Reception employee is required to check in an appointment.",
      403,
    );
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
    checkInError("APPOINTMENT_NOT_FOUND", "The appointment could not be found.", 404);
  }

  // Keep the same Appointment -> GuestAppointmentContact order as guest-token
  // cancellation/rescheduling and Reception guest identity resolution.
  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "GuestAppointmentContact" WHERE "appointmentId" = ${appointmentId} FOR UPDATE
  `;
}

/**
 * Reception check-in: verify two stored Patient identifiers, move the
 * appointment to CHECKED_IN, and create its WAITING QueueEntry atomically.
 */
export async function checkInReceptionAppointment(
  appointmentId: string,
  identity: PatientIdentityVerificationInput,
  lateArrivalAccepted: boolean,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();

  let result: CheckInTransactionResult;
  try {
    result = await prisma.$transaction(async (transaction: Transaction): Promise<CheckInTransactionResult> => {
      await assertActiveReceptionEmployee(transaction, actorEmployeeId);
      await lockAppointmentAndGuestContact(transaction, appointmentId);

      const appointment = await transaction.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          source: true,
          status: true,
          startsAt: true,
          endsAt: true,
          checkedInAt: true,
          cancelledAt: true,
          queueEntry: { select: { id: true } },
          guestContact: {
            select: {
              resolutionStatus: true,
              resolvedPatientId: true,
            },
          },
        },
      });

      if (!appointment) {
        checkInError("APPOINTMENT_NOT_FOUND", "The appointment could not be found.", 404);
      }

      const patient = appointment.patientId
        ? await transaction.patient.findUnique({
            where: { id: appointment.patientId },
            select: {
              id: true,
              isActive: true,
              mrn: true,
              firstName: true,
              middleName: true,
              lastName: true,
              dateOfBirth: true,
              contacts: {
                where: { type: "PHONE", isActive: true },
                select: { normalizedValue: true },
              },
            },
          })
        : null;

      const now = new Date();
      const appointmentLocalDate = toClinicLocalDateTime(appointment.startsAt).localDate;
      const currentLocalDate = toClinicLocalDateTime(now).localDate;
      const eligible = isReceptionAppointmentEligibleForCheckIn({
        employeeStatus: "ACTIVE", // Rechecked from the database above, in this transaction.
        activeRoles: ["RECEPTION"],
        source: appointment.source,
        patientId: appointment.patientId,
        patientIsActive: patient?.isActive === true,
        status: appointment.status,
        checkedInAt: appointment.checkedInAt,
        cancelledAt: appointment.cancelledAt,
        queueEntryExists: appointment.queueEntry !== null,
        guestContactExists: appointment.guestContact !== null,
        guestResolutionStatus: appointment.guestContact?.resolutionStatus ?? null,
        guestResolvedPatientId: appointment.guestContact?.resolvedPatientId ?? null,
        appointmentLocalDate,
        currentLocalDate,
      });

      if (!eligible) {
        if (appointment.source === "PUBLIC_WEBSITE" && appointment.patientId === null) {
          checkInError(
            "GUEST_APPOINTMENT_LINK_REQUIRED",
            "A guest appointment must be linked to an existing Patient record by Reception before check-in.",
            409,
          );
        }
        if (appointmentLocalDate !== currentLocalDate) {
          checkInError(
            "APPOINTMENT_NOT_TODAY",
            "Reception check-in is available on the appointment's Cairo-local date only.",
            409,
          );
        }
        checkInError(
          "APPOINTMENT_NOT_ELIGIBLE_FOR_CHECK_IN",
          "Only a confirmed appointment with an active Patient and no existing queue entry can be checked in.",
          409,
        );
      }

      const arrival = getReceptionArrivalDecision({
        startsAt: appointment.startsAt,
        now,
        lateArrivalAccepted,
      });
      if (arrival === "LATE_DECISION_REQUIRED") {
        checkInError(
          "LATE_ARRIVAL_REQUIRES_RECEPTION_DECISION",
          "The 10-minute grace period has passed. Reception must decide whether the patient can still be accommodated before check-in.",
          409,
        );
      }
      if (arrival === "UNEXPECTED_LATE_ACCEPTANCE" || arrival === "INVALID_TIME") {
        checkInError(
          "INVALID_CHECK_IN_ARRIVAL_DECISION",
          "The late-arrival acceptance flag is valid only after the 10-minute grace period.",
          400,
        );
      }

      if (!patient) {
        checkInError("ACTIVE_PATIENT_REQUIRED", "An active Patient record is required for check-in.", 409);
      }

      const identityMatches = verifyPatientIdentityMatch(
        patient as PatientIdentityVerificationRecord,
        identity,
      );
      const verification = await transaction.identityVerification.create({
        data: {
          patientId: patient.id,
          appointmentId: appointment.id,
          firstElement: identity.firstIdentifier.type,
          secondElement: identity.secondIdentifier.type,
          result: identityMatches ? "VERIFIED" : "FAILED",
          performedByEmployeeId: actorEmployeeId,
          verifiedAt: now,
          notes: identityMatches
            ? "Two distinct stored Patient identity elements matched during Reception check-in. Submitted values were not retained."
            : "Two distinct identity elements were compared with the linked Patient record and did not both match. Submitted values were not retained.",
        },
        select: { id: true },
      });

      if (!identityMatches) {
        await transaction.auditLog.create({
          data: {
            actorType: "EMPLOYEE",
            actorEmployeeId,
            action: "RECEPTION_CHECK_IN_IDENTITY_FAILED",
            entityType: "IdentityVerification",
            entityId: verification.id,
            reason: "Two distinct identity elements did not both match the linked Patient record. Submitted values were not retained; no queue entry was created.",
            occurredAt: now,
          },
        });
        return { outcome: "IDENTITY_MISMATCH", verificationId: verification.id };
      }

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "RECEPTION_CHECK_IN_IDENTITY_VERIFIED",
          entityType: "IdentityVerification",
          entityId: verification.id,
          reason: "Two distinct stored Patient identity elements matched during Reception check-in. Submitted values were not retained.",
          occurredAt: now,
        },
      });

      const queueDate = new Date(`${currentLocalDate}T00:00:00.000Z`);
      const queueNumber = await allocateNextDoctorQueueNumber(
        transaction,
        appointment.doctorId,
        queueDate,
      );

      const appointmentUpdate = await transaction.appointment.updateMany({
        where: {
          id: appointment.id,
          patientId: patient.id,
          status: "CONFIRMED",
          checkedInAt: null,
          cancelledAt: null,
        },
        data: { status: "CHECKED_IN", checkedInAt: now },
      });

      if (appointmentUpdate.count !== 1) {
        checkInError(
          "APPOINTMENT_STATE_CHANGED",
          "The appointment changed before check-in could be completed. Refresh and try again.",
          409,
        );
      }

      const queueEntry = await transaction.queueEntry.create({
        data: {
          patientId: patient.id,
          doctorId: appointment.doctorId,
          appointmentId: appointment.id,
          queueDate,
          queueNumber,
          type: "APPOINTMENT",
          status: "WAITING",
          checkedInAt: now,
          createdByEmployeeId: actorEmployeeId,
        },
        select: {
          id: true,
          queueNumber: true,
          queueDate: true,
          status: true,
          checkedInAt: true,
        },
      });

      const arrivalReason = `RECEPTION_CHECKED_IN|arrival=${arrival}|queueNumber=${queueNumber}`;
      await transaction.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: "CONFIRMED",
          toStatus: "CHECKED_IN",
          changeSource: "STAFF",
          changedByEmployeeId: actorEmployeeId,
          reason: arrivalReason,
          changedAt: now,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "RECEPTION_APPOINTMENT_CHECKED_IN",
          entityType: "Appointment",
          entityId: appointment.id,
          reason: `Reception checked in a confirmed appointment; arrival=${arrival}; queueNumber=${queueNumber}. The queue entry was created as WAITING.`,
          occurredAt: now,
        },
      });

      return {
        outcome: "CHECKED_IN",
        appointmentId: appointment.id,
        queueEntryId: queueEntry.id,
        queueNumber: queueEntry.queueNumber,
        queueDate: currentLocalDate,
        appointmentStatus: "CHECKED_IN",
        queueStatus: "WAITING",
        checkedInAt: queueEntry.checkedInAt.toISOString(),
        arrival,
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      throw new AppointmentBookingError(
        "APPOINTMENT_CHECK_IN_CONFLICT",
        "The appointment or doctor queue changed during check-in. Refresh and try again.",
        409,
      );
    }
    throw error;
  }

  if (result.outcome === "IDENTITY_MISMATCH") {
    throw new AppointmentBookingError(
      "PATIENT_IDENTITY_MISMATCH",
      "The two identity elements did not both match the linked Patient record. No queue entry was created; verify the selected patient and try again.",
      409,
    );
  }

  return {
    appointmentId: result.appointmentId,
    queueEntryId: result.queueEntryId,
    queueNumber: result.queueNumber,
    queueDate: result.queueDate,
    appointmentStatus: result.appointmentStatus,
    queueStatus: result.queueStatus,
    checkedInAt: result.checkedInAt,
    arrival: result.arrival,
  };
}
