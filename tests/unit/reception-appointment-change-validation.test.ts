import { describe, expect, it } from "vitest";
import {
  receptionAppointmentCancellationRequestSchema,
  receptionAppointmentChangeIdSchema,
  receptionAppointmentReschedulingRequestSchema,
} from "../../src/server/appointments/reception-appointment-change-validation";

const validReason = "PATIENT_REQUESTED" as const;

describe("Reception appointment change validation", () => {
  it("accepts one of the approved bounded cancellation reason codes", () => {
    expect(receptionAppointmentCancellationRequestSchema.safeParse({ reasonCode: validReason }).success).toBe(true);
    expect(receptionAppointmentCancellationRequestSchema.safeParse({ reasonCode: "DOCTOR_UNAVAILABLE" }).success).toBe(true);
  });

  it("rejects free-form or unknown cancellation reasons", () => {
    expect(receptionAppointmentCancellationRequestSchema.safeParse({ reasonCode: "patient called late" }).success).toBe(false);
    expect(receptionAppointmentCancellationRequestSchema.safeParse({ reasonCode: "EMERGENCY" }).success).toBe(false);
  });

  it("rejects client-supplied actor, patient, status, and cancellation metadata", () => {
    expect(receptionAppointmentCancellationRequestSchema.safeParse({
      reasonCode: validReason,
      patientId: "another_patient",
      changedByEmployeeId: "forged_employee",
      status: "CANCELLED",
      cancellationReason: "forged",
    }).success).toBe(false);
  });

  it("accepts a future offset-aware rescheduling timestamp and bounded reason", () => {
    expect(receptionAppointmentReschedulingRequestSchema.safeParse({
      reasonCode: "DOCTOR_UNAVAILABLE",
      startsAt: "2026-11-12T09:30:00.000+02:00",
    }).success).toBe(true);
  });

  it("rejects client-selected doctor, service, room, duration, and price", () => {
    expect(receptionAppointmentReschedulingRequestSchema.safeParse({
      reasonCode: validReason,
      startsAt: "2026-11-12T09:30:00.000Z",
      doctorId: "forged_doctor",
      serviceId: "forged_service",
      consultationRoomId: "forged_room",
      durationMinutes: 5,
      bookedPrice: "0.01",
    }).success).toBe(false);
  });

  it("rejects blank, overlong, missing, or malformed appointment IDs", () => {
    expect(receptionAppointmentChangeIdSchema.safeParse("appointment_demo_1").success).toBe(true);
    expect(receptionAppointmentChangeIdSchema.safeParse(" ").success).toBe(false);
    expect(receptionAppointmentChangeIdSchema.safeParse("x".repeat(81)).success).toBe(false);
    expect(receptionAppointmentReschedulingRequestSchema.safeParse({ reasonCode: validReason }).success).toBe(false);
    expect(receptionAppointmentReschedulingRequestSchema.safeParse({ reasonCode: validReason, startsAt: "next Tuesday" }).success).toBe(false);
  });
});
