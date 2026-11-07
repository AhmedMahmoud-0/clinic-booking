import { describe, expect, it } from "vitest";

import {
  CLINIC_TIME_ZONE,
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

  it("rejects invalid date values rather than using the host timezone", () => {
    expect(() => toClinicLocalDateTime(new Date(Number.NaN))).toThrow(
      "A valid Date instance is required.",
    );
  });
}
);
