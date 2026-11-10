import { describe, expect, it } from "vitest";

import { createPatientAppointmentSchema } from "../../src/server/appointments/appointment-booking-validation";

describe("patient appointment booking validation", () => {
  const validInput = {
    patientId: "patient_demo_id",
    doctorId: "doctor_demo_id",
    serviceId: "service_demo_id",
    startsAt: "2026-11-12T08:30:00.000Z",
  };

  it("accepts the exact canonical UTC instant returned by availability", () => {
    expect(createPatientAppointmentSchema.safeParse(validInput).success).toBe(true);
  });

  it("trims identifiers before use", () => {
    const result = createPatientAppointmentSchema.safeParse({
      ...validInput,
      patientId: "  patient_demo_id  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.patientId).toBe("patient_demo_id");
  });

  it("rejects local date/time strings without an explicit UTC instant", () => {
    expect(createPatientAppointmentSchema.safeParse({
      ...validInput,
      startsAt: "2026-11-12T10:30",
    }).success).toBe(false);
  });

  it("rejects offset timestamps instead of silently converting a different slot", () => {
    expect(createPatientAppointmentSchema.safeParse({
      ...validInput,
      startsAt: "2026-11-12T10:30:00+02:00",
    }).success).toBe(false);
  });

  it("rejects non-canonical ISO timestamps", () => {
    expect(createPatientAppointmentSchema.safeParse({
      ...validInput,
      startsAt: "2026-11-12T08:30:00Z",
    }).success).toBe(false);
  });

  it("rejects invalid calendar timestamps", () => {
    expect(createPatientAppointmentSchema.safeParse({
      ...validInput,
      startsAt: "not-a-date",
    }).success).toBe(false);
  });

  it("requires each patient, doctor, and service identifier", () => {
    for (const key of ["patientId", "doctorId", "serviceId"] as const) {
      const input = { ...validInput, [key]: " " };
      expect(createPatientAppointmentSchema.safeParse(input).success).toBe(false);
    }
  });

  it("rejects unknown fields such as client-supplied status, source, or price", () => {
    expect(createPatientAppointmentSchema.safeParse({
      ...validInput,
      status: "CONFIRMED",
      source: "RECEPTION",
      bookedPrice: 1,
    }).success).toBe(false);
  });
});
