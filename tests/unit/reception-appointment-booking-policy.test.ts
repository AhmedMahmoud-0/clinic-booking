import { describe, expect, it } from "vitest";
import { isReceptionAppointmentActor } from "../../src/server/appointments/reception-appointment-booking-policy";

describe("reception appointment booking actor policy", () => {
  it("allows an active Reception employee", () => {
    expect(isReceptionAppointmentActor({ employeeStatus: "ACTIVE", activeRoles: ["RECEPTION"] })).toBe(true);
  });

  it("rejects an inactive Reception employee", () => {
    expect(isReceptionAppointmentActor({ employeeStatus: "INACTIVE", activeRoles: ["RECEPTION"] })).toBe(false);
  });

  it("rejects an active employee without the Reception role", () => {
    expect(isReceptionAppointmentActor({ employeeStatus: "ACTIVE", activeRoles: ["DOCTOR"] })).toBe(false);
  });

  it("does not infer Reception authority from an empty role assignment", () => {
    expect(isReceptionAppointmentActor({ employeeStatus: "ACTIVE", activeRoles: [] })).toBe(false);
  });
});
