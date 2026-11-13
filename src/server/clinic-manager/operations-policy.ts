import { cairoDateTime, getCairoDayWindow } from "./overview-policy";

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function getCairoReportWindow(from: string, to: string) {
  return { startsAt: cairoDateTime(from), endsAt: cairoDateTime(addCalendarDays(to, 1)) };
}

const COMPLAINT_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  RECEIVED: ["ACKNOWLEDGED", "IN_REVIEW", "REJECTED"],
  ACKNOWLEDGED: ["IN_REVIEW", "RESOLVED", "REJECTED"],
  IN_REVIEW: ["RESOLVED", "REJECTED"],
  RESOLVED: ["IN_REVIEW", "CLOSED"],
  CLOSED: [],
  REJECTED: [],
};

const INCIDENT_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  REPORTED: ["UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED"],
  UNDER_REVIEW: ["ACTION_REQUIRED", "RESOLVED"],
  ACTION_REQUIRED: ["UNDER_REVIEW", "RESOLVED"],
  RESOLVED: ["CLOSED", "UNDER_REVIEW"],
  CLOSED: [],
};

export function canTransitionComplaint(from: string, to: string): boolean {
  return COMPLAINT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionIncident(from: string, to: string): boolean {
  return INCIDENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function averageMinutes(values: readonly { startedAt: Date | null; endedAt: Date | null }[]): number | null {
  const durations = values
    .filter((item): item is { startedAt: Date; endedAt: Date } => item.startedAt instanceof Date && item.endedAt instanceof Date)
    .map((item) => (item.endedAt.getTime() - item.startedAt.getTime()) / 60_000)
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (durations.length === 0) return null;
  return Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10;
}

export function startOfCairoDay(now: Date = new Date()): { date: string; startsAt: Date; endsAt: Date } {
  const window = getCairoDayWindow(now);
  return { date: window.date, startsAt: window.startsAt, endsAt: window.endsAt };
}
