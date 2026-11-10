import { describe, expect, it } from "vitest";
import { guestAppointmentReschedulingRequestSchema } from "../../src/server/appointments/guest-appointment-rescheduling-validation";

const validToken = "A".repeat(43);

describe("guest appointment rescheduling validation", () => {
  it("accepts a 32-byte base64url management token and UTC ISO timestamp", () => {
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      managementToken: validToken,
      startsAt: "2026-11-12T09:30:00.000Z",
    }).success).toBe(true);
  });

  it("accepts an ISO timestamp with an explicit offset", () => {
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      managementToken: validToken,
      startsAt: "2026-11-12T11:30:00+02:00",
    }).success).toBe(true);
  });

  it("requires the management token and replacement start time", () => {
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      startsAt: "2026-11-12T09:30:00.000Z",
    }).success).toBe(false);
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      managementToken: validToken,
    }).success).toBe(false);
  });

  it("rejects malformed, short, long, or non-base64url tokens", () => {
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      managementToken: "short",
      startsAt: "2026-11-12T09:30:00.000Z",
    }).success).toBe(false);
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      managementToken: `${validToken}A`,
      startsAt: "2026-11-12T09:30:00.000Z",
    }).success).toBe(false);
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      managementToken: `${"A".repeat(42)}+`,
      startsAt: "2026-11-12T09:30:00.000Z",
    }).success).toBe(false);
  });

  it("rejects malformed or date-only replacement values", () => {
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      managementToken: validToken,
      startsAt: "not-a-date",
    }).success).toBe(false);
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      managementToken: validToken,
      startsAt: "2026-11-12",
    }).success).toBe(false);
  });

  it("rejects client-supplied appointment, patient, doctor, service, room, price, and status fields", () => {
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      managementToken: validToken,
      startsAt: "2026-11-12T09:30:00.000Z",
      appointmentId: "forged_appointment",
      patientId: "forged_patient",
      doctorId: "forged_doctor",
      serviceId: "forged_service",
      consultationRoomId: "forged_room",
      bookedPrice: "1.00",
      status: "CONFIRMED",
    }).success).toBe(false);
  });

  it("rejects null, arrays, and token normalization", () => {
    expect(guestAppointmentReschedulingRequestSchema.safeParse(null).success).toBe(false);
    expect(guestAppointmentReschedulingRequestSchema.safeParse([]).success).toBe(false);
    expect(guestAppointmentReschedulingRequestSchema.safeParse({
      managementToken: ` ${validToken}`,
      startsAt: "2026-11-12T09:30:00.000Z",
    }).success).toBe(false);
  });
});
