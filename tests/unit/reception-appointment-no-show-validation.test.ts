import { describe, expect, it } from "vitest";
import {
  receptionAppointmentNoShowIdSchema,
  receptionAppointmentNoShowRequestSchema,
} from "../../src/server/appointments/reception-appointment-no-show-validation";

describe("Reception appointment no-show validation", () => {
  it("accepts an empty object because the server determines the reason and actor", () => {
    expect(receptionAppointmentNoShowRequestSchema.safeParse({}).success).toBe(true);
  });

  it("rejects null bodies", () => {
    expect(receptionAppointmentNoShowRequestSchema.safeParse(null).success).toBe(false);
  });

  it("rejects client-selected appointment status", () => {
    expect(receptionAppointmentNoShowRequestSchema.safeParse({ status: "NO_SHOW" }).success).toBe(false);
  });

  it("rejects client-selected patient identity", () => {
    expect(receptionAppointmentNoShowRequestSchema.safeParse({ patientId: "patient_1" }).success).toBe(false);
  });

  it("rejects client-selected actor identity", () => {
    expect(receptionAppointmentNoShowRequestSchema.safeParse({ actorEmployeeId: "employee_1" }).success).toBe(false);
  });

  it("rejects free-form reason and caller-selected reason codes", () => {
    expect(receptionAppointmentNoShowRequestSchema.safeParse({ reason: "did not arrive" }).success).toBe(false);
    expect(receptionAppointmentNoShowRequestSchema.safeParse({ reasonCode: "PATIENT_DID_NOT_ARRIVE" }).success).toBe(false);
  });

  it("accepts a valid opaque appointment identifier", () => {
    expect(receptionAppointmentNoShowIdSchema.safeParse("appointment_123").success).toBe(true);
  });

  it("rejects blank and oversized appointment identifiers", () => {
    expect(receptionAppointmentNoShowIdSchema.safeParse("   ").success).toBe(false);
    expect(receptionAppointmentNoShowIdSchema.safeParse("a".repeat(81)).success).toBe(false);
  });
});
