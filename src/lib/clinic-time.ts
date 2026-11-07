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
