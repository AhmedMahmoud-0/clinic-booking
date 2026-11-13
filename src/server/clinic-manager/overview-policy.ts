const CAIRO_TIME_ZONE = "Africa/Cairo";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

export function cairoDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Convert a Cairo-local midnight to its exact UTC instant, including DST. */
export function cairoDateTime(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  let guess = target.getTime();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]),
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const correction = target.getTime() - represented;
    guess += correction;
    if (correction === 0) break;
  }

  return new Date(guess);
}

export function getCairoDayWindow(now: Date = new Date()) {
  const date = cairoDateKey(now);
  const nextDate = addCalendarDays(date, 1);
  const startsAt = cairoDateTime(date);
  const endsAt = cairoDateTime(nextDate);
  const queueDate = new Date(`${date}T00:00:00.000Z`);

  return {
    date,
    startsAt,
    endsAt,
    queueDate,
    durationMs: endsAt.getTime() - startsAt.getTime(),
  } as const;
}

export function summarizeStaffRoles(
  employees: ReadonlyArray<{ roles: readonly string[] }>,
): Array<{ role: string; employeeCount: number }> {
  const counts = new Map<string, number>();
  for (const employee of employees) {
    for (const role of new Set(employee.roles)) {
      counts.set(role, (counts.get(role) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([role, employeeCount]) => ({ role, employeeCount }))
    .sort((left, right) => left.role.localeCompare(right.role));
}

export const CAIRO_DAY_MS = DAY_IN_MS;
