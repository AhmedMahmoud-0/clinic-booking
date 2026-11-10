/**
 * MERUNO's single clinic is in Egypt. Weekly schedules use Cairo wall-clock
 * minutes, while one-off exceptions are persisted as timezone-aware instants.
 * Centralizing the IANA time zone prevents the host machine's local zone from
 * changing weekday or minute-of-day calculations.
 */
export const CLINIC_TIME_ZONE = "Africa/Cairo";

export type ClinicWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface ClinicLocalDateTime {
  localDate: string;
  weekday: ClinicWeekday;
  localTime: string;
  minuteOfDay: number;
}

const WEEKDAY_MAP: Record<string, ClinicWeekday> = {
  Monday: "MONDAY",
  Tuesday: "TUESDAY",
  Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY",
  Friday: "FRIDAY",
  Saturday: "SATURDAY",
  Sunday: "SUNDAY",
};

const CLINIC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: CLINIC_TIME_ZONE,
  calendar: "gregory",
  numberingSystem: "latn",
  weekday: "long",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Convert an instant into the clinic's local calendar date and weekly minute. */
export function toClinicLocalDateTime(value: Date): ClinicLocalDateTime {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError("A valid Date instance is required.");
  }

  const parts = CLINIC_DATE_TIME_FORMATTER.formatToParts(value);
  const values = new Map<string, string>(
    parts.map((part) => [part.type, part.value] as const),
  );
  const weekdayLabel = values.get("weekday");
  const weekday = weekdayLabel ? WEEKDAY_MAP[weekdayLabel] : undefined;
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  const hour = Number(values.get("hour"));
  const minute = Number(values.get("minute"));

  if (
    !weekday ||
    !year ||
    !month ||
    !day ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new RangeError("The instant could not be represented in clinic time.");
  }

  return {
    localDate: `${year}-${month}-${day}`,
    weekday,
    localTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    minuteOfDay: hour * 60 + minute,
  };
}


/**
 * Convert a clinic-local calendar date and wall-clock minute into an instant.
 *
 * If the requested wall-clock minute does not exist because the clock moves
 * forward, the first representable minute later on that same local date is
 * used. This is important when a transition skips midnight in Africa/Cairo.
 * When a time is repeated as clocks move backward, a matching instant is
 * selected deterministically by the offset-correction process.
 */
export function fromClinicLocalDateTime(
  localDate: string,
  minuteOfDay: number,
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    throw new TypeError("A clinic-local date must use YYYY-MM-DD format.");
  }
  if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay > 1440) {
    throw new RangeError("Clinic-local minute must be an integer from 0 to 1440.");
  }

  const dateParts = localDate.split("-");
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  const day = Number(dateParts[2]);
  const dateCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    dateCheck.getUTCFullYear() !== year ||
    dateCheck.getUTCMonth() + 1 !== month ||
    dateCheck.getUTCDate() !== day
  ) {
    throw new TypeError("A valid clinic-local calendar date is required.");
  }

  const normalizedDate = new Date(Date.UTC(year, month - 1, day));
  const normalizedMinute = minuteOfDay === 1440 ? 0 : minuteOfDay;
  if (minuteOfDay === 1440) normalizedDate.setUTCDate(normalizedDate.getUTCDate() + 1);

  const targetDate = [
    String(normalizedDate.getUTCFullYear()).padStart(4, "0"),
    String(normalizedDate.getUTCMonth() + 1).padStart(2, "0"),
    String(normalizedDate.getUTCDate()).padStart(2, "0"),
  ].join("-");

  function resolveExactMinute(targetMinute: number): Date | null {
    const targetHour = Math.floor(targetMinute / 60);
    const targetMinutePart = targetMinute % 60;
    const targetWallClock = Date.UTC(
      normalizedDate.getUTCFullYear(),
      normalizedDate.getUTCMonth(),
      normalizedDate.getUTCDate(),
      targetHour,
      targetMinutePart,
    );

    // Fixed-point offset correction: the difference between the desired wall
    // clock and the represented wall clock is the correction to the UTC guess.
    let candidate = targetWallClock;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const represented = toClinicLocalDateTime(new Date(candidate));
      const representedDateParts = represented.localDate.split("-");
      const representedTimeParts = represented.localTime.split(":");
      const representedYear = Number(representedDateParts[0]);
      const representedMonth = Number(representedDateParts[1]);
      const representedDay = Number(representedDateParts[2]);
      const representedHour = Number(representedTimeParts[0]);
      const representedMinute = Number(representedTimeParts[1]);
      const representedWallClock = Date.UTC(
        representedYear,
        representedMonth - 1,
        representedDay,
        representedHour,
        representedMinute,
      );
      const correction = targetWallClock - representedWallClock;

      if (
        correction === 0 &&
        represented.localDate === targetDate &&
        represented.minuteOfDay === targetMinute
      ) {
        return new Date(candidate);
      }
      candidate += correction;
    }

    return null;
  }

  const exact = resolveExactMinute(normalizedMinute);
  if (exact) return exact;

  // A forward clock change can make a local range such as 00:00–00:59
  // nonexistent. Advance to the first real minute instead of treating that
  // whole clinic-local day as unavailable. Never cross into another day here.
  for (let offset = 1; normalizedMinute + offset < 1440 && offset <= 180; offset += 1) {
    const nextValid = resolveExactMinute(normalizedMinute + offset);
    if (nextValid) return nextValid;
  }

  return null;
}
