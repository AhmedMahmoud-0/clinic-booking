import { describe, expect, it } from "vitest";
import { cairoDateKey, cairoDateTime, getCairoDayWindow, summarizeStaffRoles } from "../../src/server/clinic-manager/overview-policy";

describe("Clinic Manager overview date policy", () => {
  it("uses the clinic-local Cairo date instead of the host UTC date", () => {
    const now = new Date("2026-11-12T22:30:00.000Z");
    expect(cairoDateKey(now)).toBe("2026-11-13");
  });

  it("builds an exclusive day window from Cairo midnight boundaries", () => {
    const now = new Date("2026-11-13T10:00:00.000Z");
    const window = getCairoDayWindow(now);
    expect(window.date).toBe("2026-11-13");
    expect(window.startsAt.getTime()).toBeLessThan(now.getTime());
    expect(window.endsAt.getTime()).toBeGreaterThan(now.getTime());
    expect(window.queueDate.toISOString()).toBe("2026-11-13T00:00:00.000Z");
    expect(cairoDateKey(window.startsAt)).toBe(window.date);
    expect(cairoDateKey(new Date(window.endsAt.getTime() - 1))).toBe(window.date);
  });

  it("converts a Cairo date boundary to a valid instant", () => {
    const boundary = cairoDateTime("2026-11-13");
    expect(Number.isNaN(boundary.getTime())).toBe(false);
    expect(cairoDateKey(boundary)).toBe("2026-11-13");
  });
});

describe("Clinic Manager staff role summary", () => {
  it("counts each employee once per active role and tolerates multiple roles", () => {
    expect(summarizeStaffRoles([
      { roles: ["DOCTOR", "CLINIC_MANAGER"] },
      { roles: ["DOCTOR"] },
      { roles: [] },
    ])).toEqual([
      { role: "CLINIC_MANAGER", employeeCount: 1 },
      { role: "DOCTOR", employeeCount: 2 },
    ]);
  });
});
