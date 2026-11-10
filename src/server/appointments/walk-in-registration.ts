import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { fromClinicLocalDateTime, toClinicLocalDateTime } from "../../lib/clinic-time";
import { getPrismaClient } from "../db/client";
import {
  verifyPatientIdentityMatch,
  type PatientIdentityVerificationInput,
  type PatientIdentityVerificationRecord,
} from "../patient-management/identity-verification-validation";
import { AppointmentBookingError } from "./appointment-booking-errors";
import { allocateNextDoctorQueueNumber } from "./doctor-queue-number";
import { decideWalkInRegistration } from "./walk-in-registration-policy";

type Transaction = Prisma.TransactionClient;

const BLOCKING_APPOINTMENT_STATUSES = ["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"] as const;

function nextLocalDate(localDate: string): string {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function walkInError(code: string, message: string, status: number): never {
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
      roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } },
    },
  });

  if (!employee || employee.status !== "ACTIVE" || !employee.roleAssignments.some((assignment) => assignment.role === "RECEPTION")) {
    walkInError("RECEPTION_PERMISSION_REQUIRED", "An active Reception employee is required to register a walk-in.", 403);
  }
}

function dateOnlyUtc(localDate: string): Date {
  return new Date(`${localDate}T00:00:00.000Z`);
}

function isMinuteInsideWeeklyRows(
  rows: readonly { startMinuteOfDay: number; endMinuteOfDay: number }[],
  minuteOfDay: number,
): boolean {
  return rows.some((row) => minuteOfDay >= row.startMinuteOfDay && minuteOfDay < row.endMinuteOfDay);
}

function isOpenAtInstant(input: {
  weeklyRows: readonly { startMinuteOfDay: number; endMinuteOfDay: number }[];
  exceptions: readonly { type: "BLOCKED" | "EXTRA_HOURS"; startsAt: Date; endsAt: Date }[];
  now: Date;
  minuteOfDay: number;
}): boolean {
  const blocked = input.exceptions.some((row) => row.type === "BLOCKED" && row.startsAt <= input.now && row.endsAt > input.now);
  if (blocked) return false;
  const weeklyOpen = isMinuteInsideWeeklyRows(input.weeklyRows, input.minuteOfDay);
  const extraOpen = input.exceptions.some((row) => row.type === "EXTRA_HOURS" && row.startsAt <= input.now && row.endsAt > input.now);
  return weeklyOpen || extraOpen;
}

async function isClinicAndDoctorOpenNow(
  transaction: Transaction,
  doctorId: string,
  now: Date,
  local: ReturnType<typeof toClinicLocalDateTime>,
): Promise<{ clinicIsOpen: boolean; doctorIsScheduled: boolean }> {
  const clinicDate = dateOnlyUtc(local.localDate);
  const exceptionFilter = { startsAt: { lte: now }, endsAt: { gt: now } };
  const [clinicWeekly, clinicExceptions, doctorWeekly, doctorExceptions] = await Promise.all([
    transaction.clinicWeeklySchedule.findMany({
      where: {
        weekday: local.weekday,
        isActive: true,
        effectiveFrom: { lte: clinicDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: clinicDate } }],
      },
      select: { startMinuteOfDay: true, endMinuteOfDay: true },
    }),
    transaction.clinicScheduleException.findMany({ where: exceptionFilter, select: { type: true, startsAt: true, endsAt: true } }),
    transaction.doctorWeeklySchedule.findMany({
      where: {
        doctorId,
        weekday: local.weekday,
        isActive: true,
        effectiveFrom: { lte: clinicDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: clinicDate } }],
      },
      select: { startMinuteOfDay: true, endMinuteOfDay: true },
    }),
    transaction.doctorScheduleException.findMany({ where: { doctorId, ...exceptionFilter }, select: { type: true, startsAt: true, endsAt: true } }),
  ]);

  return {
    clinicIsOpen: isOpenAtInstant({
      weeklyRows: clinicWeekly,
      exceptions: clinicExceptions,
      now,
      minuteOfDay: local.minuteOfDay,
    }),
    doctorIsScheduled: isOpenAtInstant({
      weeklyRows: doctorWeekly,
      exceptions: doctorExceptions,
      now,
      minuteOfDay: local.minuteOfDay,
    }),
  };
}

/**
 * Reception walk-in registration for an existing patient only.
 * Identity verification, schedule checks, duplicate checks, queue allocation,
 * queue creation, and audit events commit in one Serializable transaction.
 */
export async function registerReceptionWalkIn(
  patientId: string,
  doctorId: string,
  identity: PatientIdentityVerificationInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();

  try {
    const result = await prisma.$transaction(async (transaction: Transaction) => {
      await assertActiveReceptionEmployee(transaction, actorEmployeeId);

      const patient = await transaction.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          isActive: true,
          mrn: true,
          firstName: true,
          middleName: true,
          lastName: true,
          dateOfBirth: true,
          contacts: { where: { type: "PHONE", isActive: true }, select: { normalizedValue: true } },
        },
      });
      const doctor = await transaction.doctorProfile.findFirst({
        where: { id: doctorId, employee: { is: { status: "ACTIVE" } } },
        select: {
          id: true,
          publicDisplayName: true,
          professionalTitle: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      });

      const now = new Date();
      const local = toClinicLocalDateTime(now);
      const queueDate = dateOnlyUtc(local.localDate);
      const dayStart = fromClinicLocalDateTime(local.localDate, 0);
      const dayEnd = fromClinicLocalDateTime(nextLocalDate(local.localDate), 0);
      if (!dayStart || !dayEnd) walkInError("CLINIC_LOCAL_DATE_UNAVAILABLE", "The current Cairo-local day could not be represented.", 409);
      const schedule = doctor
        ? await isClinicAndDoctorOpenNow(transaction, doctor.id, now, local)
        : { clinicIsOpen: false, doctorIsScheduled: false };

      // The common mutex shared with check-in and Call Next prevents duplicate
      // ticket allocation and serializes same-doctor queue mutations.
      if (doctor) {
        const locked = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "DoctorProfile" WHERE "id" = ${doctor.id} FOR UPDATE
        `;
        if (locked.length !== 1) {
          walkInError("ACTIVE_DOCTOR_REQUIRED", "The selected doctor is not active.", 409);
        }
      }

      let ongoingAppointment: { id: string } | null = null;
      let inServiceTicket: { id: string } | null = null;
      let patientAppointment: { id: string } | null = null;
      let patientQueueEntry: { id: string } | null = null;
      if (doctor && patient) {
        [ongoingAppointment, inServiceTicket, patientAppointment, patientQueueEntry] = await Promise.all([
          transaction.appointment.findFirst({
            where: {
              doctorId: doctor.id,
              status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
              startsAt: { lte: now },
              endsAt: { gt: now },
            },
            select: { id: true },
          }),
          transaction.queueEntry.findFirst({
            where: { doctorId: doctor.id, queueDate, status: "IN_SERVICE" },
            select: { id: true },
          }),
          transaction.appointment.findFirst({
            where: {
              patientId: patient.id,
              doctorId: doctor.id,
              status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
              startsAt: { lt: dayEnd },
              endsAt: { gt: dayStart },
            },
            select: { id: true },
          }),
          transaction.queueEntry.findFirst({
            where: { patientId: patient.id, doctorId: doctor.id, queueDate, status: { in: ["WAITING", "CALLED", "IN_SERVICE"] } },
            select: { id: true },
          }),
        ]);
      }

      const decision = decideWalkInRegistration({
        employeeStatus: "ACTIVE", // Rechecked above in the same transaction.
        activeRoles: ["RECEPTION"],
        patientIsActive: patient?.isActive === true,
        doctorIsActive: doctor !== null,
        clinicIsOpen: schedule.clinicIsOpen,
        doctorIsScheduled: schedule.doctorIsScheduled,
        doctorHasOngoingAppointment: ongoingAppointment !== null,
        doctorHasInServiceTicket: inServiceTicket !== null,
        patientHasBlockingAppointment: patientAppointment !== null,
        patientHasActiveQueueEntry: patientQueueEntry !== null,
      });

      if (!decision.allowed) {
        const messages: Record<typeof decision.code, { message: string; status: number }> = {
          RECEPTION_PERMISSION_REQUIRED: { message: "An active Reception employee is required to register a walk-in.", status: 403 },
          ACTIVE_PATIENT_REQUIRED: { message: "Select an existing active Patient record. Register a new patient first if no record exists.", status: 409 },
          ACTIVE_DOCTOR_REQUIRED: { message: "The selected doctor is not active.", status: 409 },
          CLINIC_CLOSED: { message: "The clinic is not open at the current Cairo-local time.", status: 409 },
          DOCTOR_NOT_SCHEDULED: { message: "The selected doctor is not scheduled to work at the current Cairo-local time.", status: 409 },
          DOCTOR_BUSY: { message: "The doctor is currently serving an appointment or another patient. A walk-in cannot displace that work.", status: 409 },
          PATIENT_HAS_APPOINTMENT: { message: "This patient already has an active appointment with this doctor today. Use the appointment check-in flow instead.", status: 409 },
          PATIENT_ALREADY_QUEUED: { message: "This patient already has an active queue ticket for this doctor today.", status: 409 },
        };
        walkInError(decision.code, messages[decision.code].message, messages[decision.code].status);
      }

      if (!patient || !doctor) {
        walkInError("WALK_IN_RECORD_NOT_FOUND", "The selected active Patient and Doctor records are required.", 404);
      }

      const identityMatches = verifyPatientIdentityMatch(patient as PatientIdentityVerificationRecord, identity);
      const verification = await transaction.identityVerification.create({
        data: {
          patientId: patient.id,
          firstElement: identity.firstIdentifier.type,
          secondElement: identity.secondIdentifier.type,
          result: identityMatches ? "VERIFIED" : "FAILED",
          performedByEmployeeId: actorEmployeeId,
          verifiedAt: now,
          notes: identityMatches
            ? "Two distinct stored Patient identity elements matched during Reception walk-in registration. Submitted values were not retained."
            : "Two distinct identity elements were compared with the selected Patient record and did not both match. Submitted values were not retained.",
        },
        select: { id: true },
      });

      if (!identityMatches) {
        await transaction.auditLog.create({
          data: {
            actorType: "EMPLOYEE",
            actorEmployeeId,
            action: "RECEPTION_WALK_IN_IDENTITY_FAILED",
            entityType: "IdentityVerification",
            entityId: verification.id,
            reason: "Two distinct identity elements did not both match the selected Patient record. Submitted values were not retained; no queue entry was created.",
            occurredAt: now,
          },
        });
        return { outcome: "IDENTITY_MISMATCH" as const, verificationId: verification.id };
      }

      const queueNumber = await allocateNextDoctorQueueNumber(transaction, doctor.id, queueDate);
      const queueEntry = await transaction.queueEntry.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          queueDate,
          queueNumber,
          type: "WALK_IN",
          status: "WAITING",
          checkedInAt: now,
          createdByEmployeeId: actorEmployeeId,
        },
        select: { id: true, queueNumber: true, status: true, checkedInAt: true },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "RECEPTION_WALK_IN_REGISTERED",
          entityType: "QueueEntry",
          entityId: queueEntry.id,
          reason: `Reception registered an existing active patient as a WALK_IN ticket for the active doctor on ${local.localDate}. Queue number ${queueNumber}. Two distinct identity elements were verified; no patient or clinical details were copied to the audit record.`,
          occurredAt: now,
        },
      });

      return {
        outcome: "REGISTERED" as const,
        queueEntryId: queueEntry.id,
        queueNumber: queueEntry.queueNumber,
        queueDate: local.localDate,
        queueStatus: queueEntry.status,
        checkedInAt: queueEntry.checkedInAt.toISOString(),
        doctor: {
          id: doctor.id,
          displayName: doctor.publicDisplayName?.trim() || [doctor.professionalTitle, doctor.employee.firstName, doctor.employee.lastName].filter(Boolean).join(" "),
        },
        patient: { id: patient.id, mrn: patient.mrn },
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });

    if (result.outcome === "IDENTITY_MISMATCH") {
      walkInError("PATIENT_IDENTITY_MISMATCH", "The two identity elements did not both match the selected Patient record. No walk-in ticket was created.", 409);
    }

    return result;
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      walkInError("WALK_IN_CONCURRENT_CHANGE", "The doctor queue or Patient state changed during walk-in registration. Refresh and try again.", 409);
    }
    throw error;
  }
}
