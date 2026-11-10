import { describe, expect, it } from "vitest";
import {
  patientAppointmentCancellationRequestSchema,
  patientAppointmentIdSchema,
} from "../../src/server/appointments/patient-appointment-cancellation-validation";

describe("patient appointment cancellation validation", () => {
  it("accepts only an empty request object", () => {
    expect(patientAppointmentCancellationRequestSchema.safeParse({}).success).toBe(true);
  });

  it("rejects client-supplied actor, reason, or appointment status fields", () => {
    expect(patientAppointmentCancellationRequestSchema.safeParse({
      patientId: "another_patient",
      changedByPatientId: "forged_actor",
      reason: "CUSTOM_REASON",
      status: "CANCELLED",
    }).success).toBe(false);
  });

  it("rejects non-object request bodies", () => {
    expect(patientAppointmentCancellationRequestSchema.safeParse(null).success).toBe(false);
    expect(patientAppointmentCancellationRequestSchema.safeParse([]).success).toBe(false);
  });

  it("accepts a non-empty appointment ID within the route limit", () => {
    expect(patientAppointmentIdSchema.safeParse("appt_demo_123").success).toBe(true);
  });

  it("rejects blank or overlong appointment IDs", () => {
    expect(patientAppointmentIdSchema.safeParse(" ").success).toBe(false);
    expect(patientAppointmentIdSchema.safeParse("a".repeat(81)).success).toBe(false);
  });
});
