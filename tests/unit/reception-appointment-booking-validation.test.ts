import { describe, expect, it } from "vitest";
import { createReceptionAppointmentSchema } from "../../src/server/appointments/reception-appointment-booking-validation";

describe("reception appointment booking validation", () => {
  const validRequest = {
    patientId: "patient_demo_1",
    doctorId: "doctor_demo_1",
    serviceId: "service_demo_1",
    startsAt: "2099-01-05T08:30:00.000Z",
  };

  it("accepts an existing-patient booking with a canonical UTC instant", () => {
    expect(createReceptionAppointmentSchema.safeParse(validRequest).success).toBe(true);
  });

  it("trims identifiers before accepting the request", () => {
    const parsed = createReceptionAppointmentSchema.parse({
      ...validRequest,
      patientId: " patient_demo_1 ",
    });
    expect(parsed.patientId).toBe("patient_demo_1");
  });

  it("requires a patient record", () => {
    const withoutPatient: Record<string, unknown> = { ...validRequest };
    delete withoutPatient.patientId;
    expect(createReceptionAppointmentSchema.safeParse(withoutPatient).success).toBe(false);
  });

  it("rejects blank identifiers", () => {
    expect(createReceptionAppointmentSchema.safeParse({ ...validRequest, doctorId: " " }).success).toBe(false);
  });

  it("rejects non-canonical offsets instead of interpreting a local time", () => {
    expect(createReceptionAppointmentSchema.safeParse({
      ...validRequest,
      startsAt: "2099-01-05T10:30:00+02:00",
    }).success).toBe(false);
  });

  it("rejects invalid timestamps", () => {
    expect(createReceptionAppointmentSchema.safeParse({ ...validRequest, startsAt: "not-a-date" }).success).toBe(false);
  });

  it("rejects date-only values", () => {
    expect(createReceptionAppointmentSchema.safeParse({ ...validRequest, startsAt: "2099-01-05" }).success).toBe(false);
  });

  it("rejects client-supplied employee, role, or override fields", () => {
    expect(createReceptionAppointmentSchema.safeParse({
      ...validRequest,
      employeeId: "forged_employee",
      role: "RECEPTION",
      allowPatientOverlap: true,
    }).success).toBe(false);
  });
});
