import { describe, expect, it } from "vitest";

import {
  generateAppointmentSlots,
  intersectTimeIntervals,
  mergeTimeIntervals,
  subtractTimeIntervals,
} from "../../src/server/appointments/availability-policy";

describe("appointment availability interval policy", () => {
  it("merges overlapping and adjacent windows", () => {
    expect(mergeTimeIntervals([
      { start: 30, end: 60 },
      { start: 0, end: 30 },
      { start: 55, end: 90 },
      { start: 120, end: 150 },
    ])).toEqual([
      { start: 0, end: 90 },
      { start: 120, end: 150 },
    ]);
  });

  it("subtracts clinic closures from opening intervals", () => {
    expect(subtractTimeIntervals(
      [{ start: 0, end: 240 }],
      [{ start: 60, end: 90 }, { start: 180, end: 300 }],
    )).toEqual([
      { start: 0, end: 60 },
      { start: 90, end: 180 },
    ]);
  });

  it("intersects doctor hours with clinic hours", () => {
    expect(intersectTimeIntervals(
      [{ start: 0, end: 120 }, { start: 180, end: 300 }],
      [{ start: 60, end: 240 }],
    )).toEqual([
      { start: 60, end: 120 },
      { start: 180, end: 240 },
    ]);
  });

  it("generates candidates using the configured service duration", () => {
    expect(generateAppointmentSlots({
      availableIntervals: [{ start: 0, end: 120 * 60_000 }],
      durationMinutes: 30,
      doctorBusyIntervals: [],
      activeRoomIds: [],
      roomBusyIntervalsById: {},
      now: -1,
    })).toEqual([
      { start: 0, end: 30 * 60_000 },
      { start: 30 * 60_000, end: 60 * 60_000 },
      { start: 60 * 60_000, end: 90 * 60_000 },
      { start: 90 * 60_000, end: 120 * 60_000 },
    ]);
  });

  it("does not generate a slot that exceeds a schedule interval", () => {
    expect(generateAppointmentSlots({
      availableIntervals: [{ start: 0, end: 55 * 60_000 }],
      durationMinutes: 30,
      doctorBusyIntervals: [],
      activeRoomIds: [],
      roomBusyIntervalsById: {},
      now: -1,
    })).toEqual([{ start: 0, end: 30 * 60_000 }]);
  });

  it("excludes doctor conflicts but allows adjacent appointments", () => {
    expect(generateAppointmentSlots({
      availableIntervals: [{ start: 0, end: 120 * 60_000 }],
      durationMinutes: 30,
      doctorBusyIntervals: [{ start: 30 * 60_000, end: 60 * 60_000 }],
      activeRoomIds: [],
      roomBusyIntervalsById: {},
      now: -1,
    })).toEqual([
      { start: 0, end: 30 * 60_000 },
      { start: 60 * 60_000, end: 90 * 60_000 },
      { start: 90 * 60_000, end: 120 * 60_000 },
    ]);
  });

  it("requires at least one free consultation room only when rooms are configured", () => {
    const base = {
      availableIntervals: [{ start: 0, end: 60 * 60_000 }],
      durationMinutes: 30,
      doctorBusyIntervals: [],
      now: -1,
    };

    expect(generateAppointmentSlots({
      ...base,
      activeRoomIds: [],
      roomBusyIntervalsById: {},
    })).toHaveLength(2);

    expect(generateAppointmentSlots({
      ...base,
      activeRoomIds: ["room-a"],
      roomBusyIntervalsById: { "room-a": [{ start: 0, end: 60 * 60_000 }] },
    })).toHaveLength(0);
  });

  it("omits already elapsed candidate starts", () => {
    expect(generateAppointmentSlots({
      availableIntervals: [{ start: 0, end: 90 * 60_000 }],
      durationMinutes: 30,
      doctorBusyIntervals: [],
      activeRoomIds: [],
      roomBusyIntervalsById: {},
      now: 30 * 60_000,
    })).toEqual([
      { start: 60 * 60_000, end: 90 * 60_000 },
    ]);
  });
});
