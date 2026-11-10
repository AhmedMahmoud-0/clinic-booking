import "server-only";

import {
  fromClinicLocalDateTime,
  toClinicLocalDateTime,
} from "../../lib/clinic-time";
import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { AppointmentAvailabilityError } from "./availability-errors";
import type { AppointmentAvailabilityQuery } from "./availability-validation";
import {
  generateAppointmentSlots,
  intersectTimeIntervals,
  mergeTimeIntervals,
  subtractTimeIntervals,
  type TimeInterval,
} from "./availability-policy";

const BLOCKING_APPOINTMENT_STATUSES = [
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
] as const;

const BOOKABLE_SERVICE_TYPES = ["CONSULTATION", "FOLLOW_UP"] as const;

type AppointmentAvailabilityClient = Pick<
  Prisma.TransactionClient,
  | "doctorProfile"
  | "doctorService"
  | "clinicWeeklySchedule"
  | "clinicScheduleException"
  | "doctorWeeklySchedule"
  | "doctorScheduleException"
  | "appointment"
  | "consultationRoom"
>;

function utcDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function nextLocalDate(value: string): string {
  const date = utcDateOnly(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function toClippedInterval(
  startsAt: Date,
  endsAt: Date,
  dayStart: Date,
  dayEnd: Date,
): TimeInterval | null {
  const start = Math.max(startsAt.getTime(), dayStart.getTime());
  const end = Math.min(endsAt.getTime(), dayEnd.getTime());
  return end > start ? { start, end } : null;
}

function weeklyIntervalsToInstants(
  rows: readonly { startMinuteOfDay: number; endMinuteOfDay: number }[],
  localDate: string,
): TimeInterval[] {
  const intervals: TimeInterval[] = [];

  for (const row of rows) {
    const start = fromClinicLocalDateTime(localDate, row.startMinuteOfDay);
    const end = fromClinicLocalDateTime(localDate, row.endMinuteOfDay);
    if (start && end && end.getTime() > start.getTime()) {
      intervals.push({ start: start.getTime(), end: end.getTime() });
    }
  }

  return mergeTimeIntervals(intervals);
}

function exceptionIntervals(
  rows: readonly { type: "BLOCKED" | "EXTRA_HOURS"; startsAt: Date; endsAt: Date }[],
  type: "BLOCKED" | "EXTRA_HOURS",
  dayStart: Date,
  dayEnd: Date,
): TimeInterval[] {
  return rows
    .filter((row) => row.type === type)
    .map((row) => toClippedInterval(row.startsAt, row.endsAt, dayStart, dayEnd))
    .filter((interval): interval is TimeInterval => interval !== null);
}

function displayName(doctor: { publicDisplayName: string | null }): string {
  return doctor.publicDisplayName ?? "Doctor";
}

/**
 * Public, read-only availability calculation.
 *
 * This endpoint never reserves a slot. A caller may provide a Prisma
 * transaction client so booking mutations can reuse the exact same schedule
 * and slot calculation inside their serializable transaction. PostgreSQL
 * exclusion constraints remain authoritative under concurrent writes.
 */
export interface AppointmentAvailabilityOptions {
  /** Internal-only exclusion used when an existing appointment is moving slots. */
  excludeAppointmentId?: string;
}

export async function getPublicAppointmentAvailability(
  input: AppointmentAvailabilityQuery,
  prisma: AppointmentAvailabilityClient = getPrismaClient(),
  options: AppointmentAvailabilityOptions = {},
) {
  const dayStart = fromClinicLocalDateTime(input.date, 0);
  const dayEnd = fromClinicLocalDateTime(nextLocalDate(input.date), 0);
  if (!dayStart || !dayEnd || dayEnd.getTime() <= dayStart.getTime()) {
    throw new AppointmentAvailabilityError(
      "CLINIC_LOCAL_DATE_UNAVAILABLE",
      "The requested clinic-local date cannot be represented in the clinic time zone.",
      400,
    );
  }

  const todayInClinic = toClinicLocalDateTime(new Date()).localDate;
  if (input.date < todayInClinic) {
    return {
      localDate: input.date,
      timeZone: "Africa/Cairo",
      doctor: null,
      service: null,
      slots: [],
    };
  }

  const doctor = await prisma.doctorProfile.findFirst({
    where: {
      id: input.doctorId,
      isBookable: true,
      isPubliclyVisible: true,
      publicDisplayName: { not: null },
      employee: { is: { status: "ACTIVE" } },
      specialties: { some: { specialty: { is: { isActive: true } } } },
    },
    select: {
      id: true,
      publicDisplayName: true,
      professionalTitle: true,
    },
  });

  if (!doctor) {
    throw new AppointmentAvailabilityError(
      "BOOKABLE_DOCTOR_NOT_FOUND",
      "The selected doctor is not currently available for public booking.",
      404,
    );
  }

  const doctorService = await prisma.doctorService.findFirst({
    where: {
      doctorId: doctor.id,
      serviceId: input.serviceId,
      isActive: true,
      service: {
        is: {
          isActive: true,
          type: { in: [...BOOKABLE_SERVICE_TYPES] },
        },
      },
    },
    select: {
      id: true,
      durationMinutes: true,
      price: true,
      currencyCode: true,
      service: { select: { id: true, name: true, type: true } },
    },
  });

  if (!doctorService) {
    throw new AppointmentAvailabilityError(
      "BOOKABLE_SERVICE_NOT_FOUND",
      "The selected service is not currently offered by this doctor.",
      404,
    );
  }

  const clinicDate = utcDateOnly(input.date);
  const weekday = toClinicLocalDateTime(dayStart).weekday;
  const overlapFilter = { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } };

  const [
    clinicWeeklySchedules,
    clinicExceptions,
    doctorWeeklySchedules,
    doctorExceptions,
    doctorAppointments,
    activeRooms,
  ] = await Promise.all([
    prisma.clinicWeeklySchedule.findMany({
      where: {
        weekday,
        isActive: true,
        effectiveFrom: { lte: clinicDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: clinicDate } }],
      },
      select: { startMinuteOfDay: true, endMinuteOfDay: true },
    }),
    prisma.clinicScheduleException.findMany({
      where: overlapFilter,
      select: { type: true, startsAt: true, endsAt: true },
    }),
    prisma.doctorWeeklySchedule.findMany({
      where: {
        doctorId: doctor.id,
        weekday,
        isActive: true,
        effectiveFrom: { lte: clinicDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: clinicDate } }],
      },
      select: { startMinuteOfDay: true, endMinuteOfDay: true },
    }),
    prisma.doctorScheduleException.findMany({
      where: { doctorId: doctor.id, ...overlapFilter },
      select: { type: true, startsAt: true, endsAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        ...(options.excludeAppointmentId ? { id: { not: options.excludeAppointmentId } } : {}),
        doctorId: doctor.id,
        status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
        ...overlapFilter,
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.consultationRoom.findMany({
      where: { isActive: true },
      select: { id: true },
    }),
  ]);

  const clinicBase = weeklyIntervalsToInstants(clinicWeeklySchedules, input.date);
  const clinicExtra = exceptionIntervals(clinicExceptions, "EXTRA_HOURS", dayStart, dayEnd);
  const clinicBlocked = exceptionIntervals(clinicExceptions, "BLOCKED", dayStart, dayEnd);
  const clinicOpen = subtractTimeIntervals(
    mergeTimeIntervals([...clinicBase, ...clinicExtra]),
    clinicBlocked,
  );

  const doctorBase = weeklyIntervalsToInstants(doctorWeeklySchedules, input.date);
  const doctorExtra = exceptionIntervals(doctorExceptions, "EXTRA_HOURS", dayStart, dayEnd);
  const doctorBlocked = exceptionIntervals(doctorExceptions, "BLOCKED", dayStart, dayEnd);
  const doctorOpen = subtractTimeIntervals(
    mergeTimeIntervals([...doctorBase, ...doctorExtra]),
    doctorBlocked,
  );

  // Doctor hours must still be inside clinic operating intervals. This also
  // ensures clinic BLOCKED exceptions override doctor EXTRA_HOURS exceptions.
  const availableIntervals = intersectTimeIntervals(clinicOpen, doctorOpen);
  const doctorBusyIntervals = doctorAppointments.map((appointment) => ({
    start: appointment.startsAt.getTime(),
    end: appointment.endsAt.getTime(),
  }));

  const roomIds = activeRooms.map((room) => room.id);
  const roomAppointments = roomIds.length > 0
    ? await prisma.appointment.findMany({
        where: {
          ...(options.excludeAppointmentId ? { id: { not: options.excludeAppointmentId } } : {}),
          consultationRoomId: { in: roomIds },
          status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
          ...overlapFilter,
        },
        select: { consultationRoomId: true, startsAt: true, endsAt: true },
      })
    : [];

  const roomBusyIntervalsById: Record<string, TimeInterval[]> = {};
  for (const roomId of roomIds) roomBusyIntervalsById[roomId] = [];
  for (const appointment of roomAppointments) {
    if (!appointment.consultationRoomId) continue;
    roomBusyIntervalsById[appointment.consultationRoomId]?.push({
      start: appointment.startsAt.getTime(),
      end: appointment.endsAt.getTime(),
    });
  }

  const slots = generateAppointmentSlots({
    availableIntervals,
    durationMinutes: doctorService.durationMinutes,
    doctorBusyIntervals,
    activeRoomIds: roomIds,
    roomBusyIntervalsById,
  }).map((slot) => {
    const startsAt = new Date(slot.start);
    const endsAt = new Date(slot.end);
    return {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      startTime: toClinicLocalDateTime(startsAt).localTime,
      endTime: toClinicLocalDateTime(endsAt).localTime,
    };
  });

  return {
    localDate: input.date,
    timeZone: "Africa/Cairo",
    doctor: {
      id: doctor.id,
      displayName: displayName(doctor),
      professionalTitle: doctor.professionalTitle,
    },
    service: {
      id: doctorService.service.id,
      name: doctorService.service.name,
      type: doctorService.service.type,
      durationMinutes: doctorService.durationMinutes,
      price: doctorService.price.toFixed(2),
      currencyCode: doctorService.currencyCode,
    },
    slots,
    availabilityIsAdvisory: true,
  };
}
