import { describe, expect, it } from "vitest";

import {
  CLINIC_TIME_ZONE,
  fromClinicLocalDateTime,
  toClinicLocalDateTime,
} from "../../src/lib/clinic-time";

describe("MERUNO clinic-local time conversion", () => {
  it("uses the approved Egypt IANA time zone", () => {
    expect(CLINIC_TIME_ZONE).toBe("Africa/Cairo");
  });

  it("converts an instant to Cairo date, weekday, and minute-of-day", () => {
    // 06:15 UTC on this winter date is 08:15 in Cairo (UTC+02:00).
    expect(toClinicLocalDateTime(new Date("2026-01-05T06:15:00.000Z"))).toEqual({
      localDate: "2026-01-05",
      weekday: "MONDAY",
      localTime: "08:15",
      minuteOfDay: 495,
    });
  });

  it("rejects invalid Date values rather than using the host timezone", () => {
    expect(() => toClinicLocalDateTime(new Date(Number.NaN))).toThrow(
      "A valid Date instance is required.",
    );
  });

  it("converts a clinic-local winter time to its correct UTC instant", () => {
    expect(fromClinicLocalDateTime("2026-01-05", 495)?.toISOString()).toBe(
      "2026-01-05T06:15:00.000Z",
    );
  });

  it("converts a clinic-local summer time without relying on the host timezone", () => {
    expect(fromClinicLocalDateTime("2026-07-01", 495)?.toISOString()).toBe(
      "2026-07-01T05:15:00.000Z",
    );
  });

  it("treats minute 1440 as midnight at the start of the next clinic day", () => {
    expect(fromClinicLocalDateTime("2026-01-05", 1440)?.toISOString()).toBe(
      "2026-01-05T22:00:00.000Z",
    );
  });

  it("advances to the first real local minute when Cairo skips midnight for daylight saving", () => {
    const instant = fromClinicLocalDateTime("2026-04-24", 0);
    expect(instant?.toISOString()).toBe("2026-04-23T22:00:00.000Z");
    expect(instant ? toClinicLocalDateTime(instant).localTime : null).toBe("01:00");
  });

  it("rejects impossible dates and invalid minute values", () => {
    expect(() => fromClinicLocalDateTime("2026-02-30", 600)).toThrow();
    expect(() => fromClinicLocalDateTime("2026-01-05", 1441)).toThrow();
  });
});
