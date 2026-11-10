import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { toClinicLocalDateTime } from "../../lib/clinic-time";
import { getPrismaClient } from "../db/client";
import { AppointmentBookingError } from "./appointment-booking-errors";
import { decideDoctorEncounterStart } from "./doctor-encounter-start-policy";

type Transaction = Prisma.TransactionClient;

function startError(code: string, message: string, status: number): never {
  throw new AppointmentBookingError(code, message, status);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

const queueEntrySelect = {
  id: true,
  doctorId: true,
  patientId: true,
  appointmentId: true,
  queueDate: true,
  queueNumber: true,
  type: true,
  status: true,
  calledAt: true,
  serviceStartedAt: true,
  patient: {
    select: {
      id: true,
      isActive: true,
    },
  },
  appointment: {
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      status: true,
      checkedInAt: true,
      cancelledAt: true,
      completedAt: true,
      encounter: {
        select: { id: true, status: true, startedAt: true, appointmentId: true, queueEntryId: true },
      },
    },
  },
  encounter: {
    select: {
      id: true,
      status: true,
      startedAt: true,
      appointmentId: true,
      queueEntryId: true,
    },
  },
} satisfies Prisma.QueueEntrySelect;

type QueueEntrySource = Prisma.QueueEntryGetPayload<{ select: typeof queueEntrySelect }>;

function toStartResult(input: {
  outcome: "STARTED" | "ALREADY_STARTED";
  queueEntry: Pick<QueueEntrySource, "id" | "queueNumber" | "type">;
  encounter: { id: string; startedAt: Date };
  appointmentId: string | null;
}) {
  return {
    outcome: input.outcome,
    queueEntry: {
      id: input.queueEntry.id,
      queueNumber: input.queueEntry.queueNumber,
      type: input.queueEntry.type,
      status: "IN_SERVICE" as const,
    },
    encounter: {
      id: input.encounter.id,
      status: "IN_PROGRESS" as const,
      startedAt: input.encounter.startedAt.toISOString(),
    },
    appointment: input.appointmentId
      ? { id: input.appointmentId, status: "IN_CONSULTATION" as const }
      : null,
  };
}

/**
 * Begin the authenticated Doctor's called ticket. The DoctorProfile row is the
 * shared per-doctor mutex also used by Reception Call Next and Walk-in queue
 * allocation, so only one consultation can enter service at a time.
 */
export async function startDoctorQueueEncounter(queueEntryId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const employee = await transaction.employee.findUnique({
        where: { id: actorEmployeeId },
        select: {
          status: true,
          roleAssignments: {
            where: { status: "ACTIVE" },
            select: { role: true },
          },
          doctorProfile: { select: { id: true } },
        },
      });

      if (!employee || employee.status !== "ACTIVE" || !employee.roleAssignments.some((row) => row.role === "DOCTOR")) {
        startError(
          "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
          "An active Doctor employee assignment is required to start a consultation.",
          403,
        );
      }
      if (!employee.doctorProfile) {
        startError("DOCTOR_PROFILE_REQUIRED", "The active Doctor employee does not have a linked doctor profile.", 403);
      }

      const doctorId = employee.doctorProfile.id;
      const doctorLock = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "DoctorProfile" WHERE "id" = ${doctorId} FOR UPDATE
      `;
      if (doctorLock.length !== 1) {
        startError("DOCTOR_PROFILE_REQUIRED", "The active Doctor profile is no longer available.", 403);
      }

      // Re-read the actor after acquiring the shared doctor mutex.
      const currentEmployee = await transaction.employee.findUnique({
        where: { id: actorEmployeeId },
        select: {
          status: true,
          roleAssignments: {
            where: { status: "ACTIVE" },
            select: { role: true },
          },
          doctorProfile: { select: { id: true } },
        },
      });
      if (
        !currentEmployee
        || currentEmployee.status !== "ACTIVE"
        || !currentEmployee.roleAssignments.some((row) => row.role === "DOCTOR")
        || currentEmployee.doctorProfile?.id !== doctorId
      ) {
        startError(
          "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
          "An active Doctor employee assignment linked to this doctor profile is required.",
          403,
        );
      }

      const now = new Date();
      const localDate = toClinicLocalDateTime(now).localDate;
      const queueDate = new Date(`${localDate}T00:00:00.000Z`);

      // Lock the caller-selected queue row only if it belongs to this Doctor.
      // A foreign or non-current-day ticket is intentionally reported as not found.
      const queueLock = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "QueueEntry"
        WHERE "id" = ${queueEntryId} AND "doctorId" = ${doctorId}
        FOR UPDATE
      `;
      if (queueLock.length !== 1) {
        startError("QUEUE_ENTRY_NOT_FOUND", "The queue ticket was not found for the authenticated Doctor.", 404);
      }

      let queueEntry = await transaction.queueEntry.findFirst({
        where: { id: queueEntryId, doctorId, queueDate },
        select: queueEntrySelect,
      });
      if (!queueEntry) {
        startError("QUEUE_ENTRY_NOT_TODAY", "Only tickets in the current Cairo-local-day queue can be started.", 404);
      }

      // Lock the appointment after the queue ticket, then re-read both records.
      if (queueEntry.appointmentId) {
        const appointmentLock = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "Appointment" WHERE "id" = ${queueEntry.appointmentId} FOR UPDATE
        `;
        if (appointmentLock.length !== 1) {
          startError("QUEUE_ENTRY_SOURCE_INCONSISTENT", "The appointment linked to this queue ticket is unavailable.", 409);
        }
        queueEntry = await transaction.queueEntry.findFirst({
          where: { id: queueEntryId, doctorId, queueDate },
          select: queueEntrySelect,
        });
        if (!queueEntry) {
          startError("QUEUE_ENTRY_NOT_FOUND", "The queue ticket is no longer available.", 404);
        }
      }

      const otherInService = await transaction.queueEntry.findFirst({
        where: {
          doctorId,
          status: "IN_SERVICE",
          id: { not: queueEntry.id },
        },
        select: { id: true },
      });

      const decision = decideDoctorEncounterStart({
        employeeStatus: currentEmployee.status,
        activeRoles: currentEmployee.roleAssignments.map((row) => row.role),
        doctorProfileLinked: currentEmployee.doctorProfile?.id === doctorId,
        queueEntryExists: true,
        queueDateIsToday: true,
        queueStatus: queueEntry.status,
        queueType: queueEntry.type,
        queueAppointmentId: queueEntry.appointmentId,
        queueCalledAtExists: queueEntry.calledAt !== null,
        patientIsActive: queueEntry.patient.isActive,
        appointmentExists: queueEntry.appointment !== null,
        appointmentId: queueEntry.appointment?.id ?? null,
        appointmentPatientMatches: queueEntry.appointment?.patientId === queueEntry.patientId,
        appointmentDoctorMatches: queueEntry.appointment?.doctorId === doctorId,
        appointmentStatus: queueEntry.appointment?.status ?? null,
        appointmentStateIsReady: queueEntry.appointment !== null
          && queueEntry.appointment.checkedInAt !== null
          && queueEntry.appointment.cancelledAt === null
          && queueEntry.appointment.completedAt === null,
        serviceStartedAtExists: queueEntry.serviceStartedAt !== null,
        encounterOriginIsConsistent: queueEntry.type === "APPOINTMENT"
          ? queueEntry.encounter === null
            && (queueEntry.appointment === null
              || queueEntry.appointment.encounter === null
              || (queueEntry.appointment.encounter.appointmentId === queueEntry.appointment.id
                && queueEntry.appointment.encounter.queueEntryId === null))
          : queueEntry.appointment === null
            && (queueEntry.encounter === null
              || (queueEntry.encounter.queueEntryId === queueEntry.id && queueEntry.encounter.appointmentId === null)),
        existingEncounterId: (queueEntry.type === "APPOINTMENT" ? queueEntry.appointment?.encounter : queueEntry.encounter)?.id ?? null,
        existingEncounterStatus: (queueEntry.type === "APPOINTMENT" ? queueEntry.appointment?.encounter : queueEntry.encounter)?.status ?? null,
        doctorHasOtherInServiceEntry: otherInService !== null,
      });

      if (decision.kind === "REJECT") {
        const errors: Record<typeof decision.code, { message: string; status: number }> = {
          DOCTOR_WORKSPACE_ACCESS_REQUIRED: { message: "An active Doctor employee assignment is required.", status: 403 },
          DOCTOR_PROFILE_REQUIRED: { message: "The active Doctor profile is not linked.", status: 403 },
          QUEUE_ENTRY_NOT_FOUND: { message: "The queue ticket was not found for the authenticated Doctor.", status: 404 },
          QUEUE_ENTRY_NOT_TODAY: { message: "Only tickets in the current Cairo-local-day queue can be started.", status: 404 },
          PATIENT_NOT_ACTIVE: { message: "The patient record is inactive. Resolve the patient status before consultation.", status: 409 },
          QUEUE_ENTRY_SOURCE_INCONSISTENT: { message: "The queue ticket's appointment or walk-in linkage is inconsistent.", status: 409 },
          APPOINTMENT_NOT_READY_FOR_CONSULTATION: { message: "An appointment ticket must be linked to a checked-in appointment.", status: 409 },
          QUEUE_ENTRY_NOT_CALLED: { message: "Only a ticket currently in CALLED status can start a consultation.", status: 409 },
          ENCOUNTER_ALREADY_EXISTS: { message: "A clinical encounter is already linked to this queue ticket.", status: 409 },
          DOCTOR_ALREADY_HAS_ACTIVE_CONSULTATION: { message: "Another patient is already in consultation with this Doctor.", status: 409 },
        };
        const error = errors[decision.code];
        startError(decision.code, error.message, error.status);
      }

      if (decision.kind === "ALREADY_STARTED") {
        return toStartResult({
          outcome: "ALREADY_STARTED",
          queueEntry,
          encounter: {
            id: (queueEntry.type === "APPOINTMENT" ? queueEntry.appointment?.encounter : queueEntry.encounter)!.id,
            startedAt: (queueEntry.type === "APPOINTMENT" ? queueEntry.appointment?.encounter : queueEntry.encounter)!.startedAt,
          },
          appointmentId: queueEntry.appointmentId,
        });
      }

      const encounter = await transaction.encounter.create({
        data: {
          patientId: queueEntry.patientId,
          doctorId,
          appointmentId: queueEntry.type === "APPOINTMENT" ? queueEntry.appointmentId : null,
          queueEntryId: queueEntry.type === "WALK_IN" ? queueEntry.id : null,
          status: "IN_PROGRESS",
          startedAt: now,
          createdByEmployeeId: actorEmployeeId,
        },
        select: { id: true, status: true, startedAt: true },
      });

      if (queueEntry.appointment) {
        const appointmentUpdate = await transaction.appointment.updateMany({
          where: {
            id: queueEntry.appointment.id,
            patientId: queueEntry.patientId,
            doctorId,
            status: "CHECKED_IN",
            checkedInAt: { not: null },
            cancelledAt: null,
            completedAt: null,
          },
          data: { status: "IN_CONSULTATION" },
        });
        if (appointmentUpdate.count !== 1) {
          startError(
            "APPOINTMENT_STATE_CHANGED",
            "The appointment changed before the consultation could start. Refresh the Doctor worklist.",
            409,
          );
        }

        await transaction.appointmentStatusHistory.create({
          data: {
            appointmentId: queueEntry.appointment.id,
            fromStatus: "CHECKED_IN",
            toStatus: "IN_CONSULTATION",
            changeSource: "STAFF",
            changedByEmployeeId: actorEmployeeId,
            reason: "DOCTOR_STARTED_CONSULTATION",
            changedAt: now,
          },
        });
      }

      const queueUpdate = await transaction.queueEntry.updateMany({
        where: {
          id: queueEntry.id,
          doctorId,
          queueDate,
          status: "CALLED",
          serviceStartedAt: null,
        },
        data: { status: "IN_SERVICE", serviceStartedAt: now },
      });
      if (queueUpdate.count !== 1) {
        startError(
          "QUEUE_ENTRY_STATE_CHANGED",
          "The queue ticket changed before the consultation could start. Refresh the Doctor worklist.",
          409,
        );
      }

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "DOCTOR_ENCOUNTER_STARTED",
          entityType: "Encounter",
          entityId: encounter.id,
          reason: `Doctor started the called queue ticket ${queueEntry.queueNumber}. The audit event contains no patient or clinical details.`,
          occurredAt: now,
        },
      });

      return toStartResult({
        outcome: "STARTED",
        queueEntry,
        encounter,
        appointmentId: queueEntry.appointmentId,
      });
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      startError(
        "DOCTOR_CONSULTATION_CONCURRENT_CHANGE",
        "The Doctor queue changed concurrently. Refresh the worklist before starting the consultation again.",
        409,
      );
    }
    throw error;
  }
}
