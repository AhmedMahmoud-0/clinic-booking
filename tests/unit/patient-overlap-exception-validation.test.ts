import { describe, expect, it } from "vitest";
import { createReceptionAppointmentSchema } from "../../src/server/appointments/reception-appointment-booking-validation";
import { resolveGuestAppointmentSchema } from "../../src/server/appointments/guest-appointment-resolution-validation";
import { PATIENT_APPOINTMENT_OVERLAP_REASON_CODES } from "../../src/server/appointments/patient-overlap-exception-validation";

const receptionBooking = {
  patientId: "patient_demo_id",
  doctorId: "doctor_demo_id",
  serviceId: "service_demo_id",
  startsAt: "2099-01-05T08:30:00.000Z",
};

const guestResolution = {
  patientId: "patient_demo_id",
  identity: {
    firstIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
    secondIdentifier: { type: "DATE_OF_BIRTH", value: "1995-04-12" },
  },
};

describe("patient appointment overlap exception validation", () => {
  it("keeps standard Reception booking valid without an overlap reason", () => {
    expect(createReceptionAppointmentSchema.safeParse(receptionBooking).success).toBe(true);
  });

  it("accepts only bounded reason codes for Reception booking", () => {
    for (const reasonCode of PATIENT_APPOINTMENT_OVERLAP_REASON_CODES) {
      expect(createReceptionAppointmentSchema.safeParse({
        ...receptionBooking,
        patientOverlapReasonCode: reasonCode,
      }).success).toBe(true);
    }
  });

  it("rejects free-text, unknown, and legacy client-controlled override claims", () => {
    expect(createReceptionAppointmentSchema.safeParse({
      ...receptionBooking,
      patientOverlapReasonCode: "Emergency — patient needs immediate attention",
    }).success).toBe(false);
    expect(createReceptionAppointmentSchema.safeParse({
      ...receptionBooking,
      patientOverlapReasonCode: "OTHER",
    }).success).toBe(false);
    expect(createReceptionAppointmentSchema.safeParse({
      ...receptionBooking,
      allowPatientOverlap: true,
    }).success).toBe(false);
  });

  it("keeps guest resolution valid without an overlap reason", () => {
    expect(resolveGuestAppointmentSchema.safeParse(guestResolution).success).toBe(true);
  });

  it("accepts the same bounded reasons when Reception resolves a guest identity", () => {
    for (const reasonCode of PATIENT_APPOINTMENT_OVERLAP_REASON_CODES) {
      expect(resolveGuestAppointmentSchema.safeParse({
        ...guestResolution,
        patientOverlapReasonCode: reasonCode,
      }).success).toBe(true);
    }
  });

  it("rejects free-text overlap reasons and forged approval metadata", () => {
    expect(resolveGuestAppointmentSchema.safeParse({
      ...guestResolution,
      patientOverlapReasonCode: "Emergency",
    }).success).toBe(false);
    expect(resolveGuestAppointmentSchema.safeParse({
      ...guestResolution,
      approvedByEmployeeId: "employee_demo_id",
    }).success).toBe(false);
  });
});
