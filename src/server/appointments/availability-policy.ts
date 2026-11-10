export interface TimeInterval {
  start: number;
  end: number;
}

export type AppointmentSlot = TimeInterval;

function isValidInterval(interval: TimeInterval): boolean {
  return Number.isFinite(interval.start) && Number.isFinite(interval.end) && interval.end > interval.start;
}

/** Merge overlapping or adjacent intervals into an ordered, non-overlapping set. */
export function mergeTimeIntervals(intervals: readonly TimeInterval[]): TimeInterval[] {
  const sorted = intervals.filter(isValidInterval).map((interval) => ({ ...interval }))
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: TimeInterval[] = [];

  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.start > previous.end) {
      merged.push(interval);
      continue;
    }
    previous.end = Math.max(previous.end, interval.end);
  }

  return merged;
}

/** Remove blocked ranges from a set of available ranges. */
export function subtractTimeIntervals(
  available: readonly TimeInterval[],
  blocked: readonly TimeInterval[],
): TimeInterval[] {
  const mergedAvailable = mergeTimeIntervals(available);
  const mergedBlocked = mergeTimeIntervals(blocked);
  const result: TimeInterval[] = [];

  for (const window of mergedAvailable) {
    let cursor = window.start;
    for (const block of mergedBlocked) {
      if (block.end <= cursor) continue;
      if (block.start >= window.end) break;
      if (block.start > cursor) {
        result.push({ start: cursor, end: Math.min(block.start, window.end) });
      }
      cursor = Math.max(cursor, block.end);
      if (cursor >= window.end) break;
    }
    if (cursor < window.end) result.push({ start: cursor, end: window.end });
  }

  return result.filter(isValidInterval);
}

/** Keep only the portions where both clinic and doctor schedules are open. */
export function intersectTimeIntervals(
  left: readonly TimeInterval[],
  right: readonly TimeInterval[],
): TimeInterval[] {
  const first = mergeTimeIntervals(left);
  const second = mergeTimeIntervals(right);
  const result: TimeInterval[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < first.length && rightIndex < second.length) {
    const a = first[leftIndex]!;
    const b = second[rightIndex]!;
    const start = Math.max(a.start, b.start);
    const end = Math.min(a.end, b.end);
    if (end > start) result.push({ start, end });
    if (a.end <= b.end) leftIndex += 1;
    else rightIndex += 1;
  }

  return result;
}

function overlaps(left: TimeInterval, right: TimeInterval): boolean {
  return left.start < right.end && left.end > right.start;
}

/**
 * Generate duration-aligned candidate appointments.
 *
 * The current master-data model defines durationMinutes but has no separate
 * slot-increment setting, so candidate starts advance by the selected service
 * duration. Existing bookings are advisory here; PostgreSQL exclusion
 * constraints remain the final concurrency guard when a booking is created.
 */
export function generateAppointmentSlots(input: {
  availableIntervals: readonly TimeInterval[];
  durationMinutes: number;
  doctorBusyIntervals: readonly TimeInterval[];
  activeRoomIds: readonly string[];
  roomBusyIntervalsById: Readonly<Record<string, readonly TimeInterval[]>>;
  now?: number;
}): AppointmentSlot[] {
  const { durationMinutes, activeRoomIds, roomBusyIntervalsById } = input;
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) return [];

  const doctorBusy = mergeTimeIntervals(input.doctorBusyIntervals);
  const roomsConfigured = activeRoomIds.length > 0;
  const result: AppointmentSlot[] = [];
  const now = input.now ?? Date.now();

  for (const window of mergeTimeIntervals(input.availableIntervals)) {
    for (
      let start = window.start;
      start + durationMinutes * 60_000 <= window.end;
      start += durationMinutes * 60_000
    ) {
      const slot = { start, end: start + durationMinutes * 60_000 };
      if (slot.start <= now) continue;
      if (doctorBusy.some((busy) => overlaps(slot, busy))) continue;

      if (roomsConfigured) {
        const hasFreeRoom = activeRoomIds.some((roomId) =>
          !mergeTimeIntervals(roomBusyIntervalsById[roomId] ?? []).some((busy) => overlaps(slot, busy)),
        );
        if (!hasFreeRoom) continue;
      }

      result.push(slot);
    }
  }

  return result;
}
