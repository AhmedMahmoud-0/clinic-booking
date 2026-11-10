import { describe, expect, it } from "vitest";
import {
  patientAppointmentReschedulingIdSchema,
  patientAppointmentReschedulingRequestSchema,
} from "../../src/server/appointments/patient-appointment-rescheduling-validation";

describe("patient appointment rescheduling validation", () => {
  it("accepts a UTC ISO timestamp", () => {
    expect(patientAppointmentReschedulingRequestSchema.safeParse({
      startsAt: "2026-11-12T09:30:00.000Z",
    }).success).toBe(true);
  });

  it("accepts an ISO timestamp with an explicit offset", () => {
    expect(patientAppointmentReschedulingRequestSchema.safeParse({
      startsAt: "2026-11-12T11:30:00+02:00",
    }).success).toBe(true);
  });

  it("rejects malformed or date-only values", () => {
    expect(patientAppointmentReschedulingRequestSchema.safeParse({ startsAt: "not-a-date" }).success).toBe(false);
    expect(patientAppointmentReschedulingRequestSchema.safeParse({ startsAt: "2026-11-12" }).success).toBe(false);
  });

  it("rejects client-supplied identity, doctor, service, room, price, or status fields", () => {
    expect(patientAppointmentReschedulingRequestSchema.safeParse({
      startsAt: "2026-11-12T09:30:00.000Z",
      patientId: "another_patient",
      doctorId: "another_doctor",
      serviceId: "another_service",
      consultationRoomId: "room_2",
      bookedPrice: "1.00",
      status: "CONFIRMED",
    }).success).toBe(false);
  });

  it("rejects null and array request bodies", () => {
    expect(patientAppointmentReschedulingRequestSchema.safeParse(null).success).toBe(false);
    expect(patientAppointmentReschedulingRequestSchema.safeParse([]).success).toBe(false);
  });

  it("validates appointment route IDs", () => {
    expect(patientAppointmentReschedulingIdSchema.safeParse("appt_demo_123").success).toBe(true);
    expect(patientAppointmentReschedulingIdSchema.safeParse(" ").success).toBe(false);
    expect(patientAppointmentReschedulingIdSchema.safeParse("a".repeat(81)).success).toBe(false);
  });
});
