import { describe, expect, it } from "vitest";
import {
  receptionAppointmentCheckInIdSchema,
  receptionAppointmentCheckInRequestSchema,
} from "../../src/server/appointments/reception-appointment-check-in-validation";

const validIdentity = {
  firstIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
  secondIdentifier: { type: "DATE_OF_BIRTH", value: "1990-05-14" },
};

describe("Reception appointment check-in validation", () => {
  it("accepts two distinct supported identity elements", () => {
    expect(receptionAppointmentCheckInRequestSchema.safeParse({ identity: validIdentity }).success).toBe(true);
  });

  it("accepts an explicit late-arrival acceptance decision", () => {
    expect(receptionAppointmentCheckInRequestSchema.safeParse({
      identity: validIdentity,
      lateArrivalAccepted: true,
    }).success).toBe(true);
  });

  it("rejects identical identity element types", () => {
    expect(receptionAppointmentCheckInRequestSchema.safeParse({
      identity: {
        firstIdentifier: { type: "PHONE", value: "01012345678" },
        secondIdentifier: { type: "PHONE", value: "01012345678" },
      },
    }).success).toBe(false);
  });

  it("rejects client-supplied patient, actor, appointment status, or queue values", () => {
    expect(receptionAppointmentCheckInRequestSchema.safeParse({
      identity: validIdentity,
      patientId: "forged_patient",
      changedByEmployeeId: "forged_employee",
      status: "WAITING",
      queueNumber: 1,
      queueDate: "2026-11-09",
      doctorId: "forged_doctor",
    }).success).toBe(false);
  });

  it("rejects free-form clinical or operational notes", () => {
    expect(receptionAppointmentCheckInRequestSchema.safeParse({
      identity: validIdentity,
      notes: "private information",
    }).success).toBe(false);
  });

  it("validates the internal appointment identifier", () => {
    expect(receptionAppointmentCheckInIdSchema.safeParse("appointment_demo_1").success).toBe(true);
    expect(receptionAppointmentCheckInIdSchema.safeParse(" ").success).toBe(false);
    expect(receptionAppointmentCheckInIdSchema.safeParse("x".repeat(81)).success).toBe(false);
  });
});
