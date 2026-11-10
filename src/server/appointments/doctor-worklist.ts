import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { toClinicLocalDateTime } from "../../lib/clinic-time";
import { getPrismaClient } from "../db/client";
import {
  getDoctorQueueWaitingMinutes,
  isActiveDoctorWorklistActor,
  resolveDoctorWorklistEncounter,
  summarizeDoctorWorklist,
} from "./doctor-worklist-policy";

export class DoctorWorklistError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DoctorWorklistError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function doctorWorklistError(code: string, message: string, status: number): never {
  throw new DoctorWorklistError(code, message, status);
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
      preferredName: true,
      mrn: true,
      isActive: true,
    },
  },
  appointment: {
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      encounter: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
        },
      },
    },
  },
  encounter: {
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
    },
  },
} satisfies Prisma.QueueEntrySelect;

type QueueEntrySource = Prisma.QueueEntryGetPayload<{ select: typeof queueEntrySelect }>;

function toDoctorQueueEntryDto(entry: QueueEntrySource, now: Date) {
  const fullName = [entry.patient.firstName, entry.patient.middleName, entry.patient.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
  const encounter = resolveDoctorWorklistEncounter({
    queueType: entry.type,
    appointmentEncounter: entry.appointment?.encounter ?? null,
    queueEncounter: entry.encounter,
  });

  return {
    id: entry.id,
    queueNumber: entry.queueNumber,
    type: entry.type,
    status: entry.status,
    checkedInAt: entry.checkedInAt.toISOString(),
    calledAt: entry.calledAt?.toISOString() ?? null,
    serviceStartedAt: entry.serviceStartedAt?.toISOString() ?? null,
    completedAt: entry.completedAt?.toISOString() ?? null,
    waitingMinutes: getDoctorQueueWaitingMinutes({
      checkedInAt: entry.checkedInAt,
      now,
      status: entry.status,
    }),
    patient: {
      id: entry.patient.id,
      name: entry.patient.preferredName?.trim() || fullName,
      mrn: entry.patient.mrn,
      isActive: entry.patient.isActive,
    },
    appointment: entry.appointment
      ? {
          id: entry.appointment.id,
          status: entry.appointment.status,
          startsAt: entry.appointment.startsAt.toISOString(),
          endsAt: entry.appointment.endsAt.toISOString(),
        }
      : null,
    encounter: encounter
      ? {
          id: encounter.id,
          status: encounter.status,
          startedAt: encounter.startedAt.toISOString(),
          completedAt: encounter.completedAt?.toISOString() ?? null,
        }
      : null,
  };
}

/**
 * Return only the current Cairo-local-day worklist for the authenticated Doctor.
 * The doctor profile is resolved from the employee actor; no caller-supplied
 * doctor ID can select another clinician's queue.
 */
export async function getDoctorQueueWorklist(actorEmployeeId: string) {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (transaction: Transaction) => {
    const employee = await transaction.employee.findUnique({
      where: { id: actorEmployeeId },
      select: {
        status: true,
        firstName: true,
        lastName: true,
        roleAssignments: {
          where: { status: "ACTIVE" },
          select: { role: true },
        },
        doctorProfile: {
          select: {
            id: true,
            publicDisplayName: true,
            professionalTitle: true,
          },
        },
      },
    });

    if (!employee || !isActiveDoctorWorklistActor({
      employeeStatus: employee.status,
      activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
    })) {
      doctorWorklistError(
        "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
        "An active Doctor employee assignment is required to view this worklist.",
        403,
      );
    }

    if (!employee.doctorProfile) {
      doctorWorklistError(
        "DOCTOR_PROFILE_REQUIRED",
        "The active Doctor employee does not have a linked doctor profile.",
        403,
      );
    }

    const now = new Date();
    const localDate = toClinicLocalDateTime(now).localDate;
    const queueDate = new Date(`${localDate}T00:00:00.000Z`);
    const entries = await transaction.queueEntry.findMany({
      where: {
        doctorId: employee.doctorProfile.id,
        queueDate,
      },
      orderBy: { queueNumber: "asc" },
      select: queueEntrySelect,
    });

    const displayName = employee.doctorProfile.publicDisplayName?.trim()
      || [employee.doctorProfile.professionalTitle, employee.firstName, employee.lastName]
        .filter((part): part is string => Boolean(part?.trim()))
        .join(" ");

    return {
      doctor: {
        id: employee.doctorProfile.id,
        displayName,
      },
      queueDate: localDate,
      summary: summarizeDoctorWorklist(entries.map((entry) => entry.status)),
      entries: entries.map((entry) => toDoctorQueueEntryDto(entry, now)),
    };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 15_000 });
}
