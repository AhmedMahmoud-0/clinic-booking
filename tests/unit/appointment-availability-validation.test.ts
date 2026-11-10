import { describe, expect, it } from "vitest";

import { appointmentAvailabilityQuerySchema } from "../../src/server/appointments/availability-validation";

describe("appointment availability request validation", () => {
  it("accepts a doctor, offered service, and real clinic-local date", () => {
    expect(appointmentAvailabilityQuerySchema.safeParse({
      doctorId: "doctor_demo_id",
      serviceId: "service_demo_id",
      date: "2026-11-12",
    }).success).toBe(true);
  });

  it("rejects a missing doctor or service", () => {
    expect(appointmentAvailabilityQuerySchema.safeParse({
      doctorId: "",
      serviceId: "service_demo_id",
      date: "2026-11-12",
    }).success).toBe(false);
    expect(appointmentAvailabilityQuerySchema.safeParse({
      doctorId: "doctor_demo_id",
      serviceId: "",
      date: "2026-11-12",
    }).success).toBe(false);
  });

  it("rejects malformed and impossible calendar dates", () => {
    for (const date of ["2026-2-03", "2026-02-30", "yesterday", "2026/11/12"]) {
      expect(appointmentAvailabilityQuerySchema.safeParse({
        doctorId: "doctor_demo_id",
        serviceId: "service_demo_id",
        date,
      }).success).toBe(false);
    }
  });

  it("rejects unknown query properties", () => {
    expect(appointmentAvailabilityQuerySchema.safeParse({
      doctorId: "doctor_demo_id",
      serviceId: "service_demo_id",
      date: "2026-11-12",
      patientId: "must-not-be-client-selectable",
    }).success).toBe(false);
  });
});
