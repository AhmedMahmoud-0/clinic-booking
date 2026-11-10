import { describe, expect, it } from "vitest";
import { isGuestAppointmentIdentityConsistent } from "../../src/server/appointments/guest-appointment-identity-policy";

const linkedAt = new Date("2026-11-09T10:00:00.000Z");

describe("guest appointment identity lifecycle", () => {
  it("accepts an unresolved guest booking without a Patient record", () => {
    expect(isGuestAppointmentIdentityConsistent({
      appointmentPatientId: null,
      guestContact: {
        resolutionStatus: "PENDING_VERIFICATION",
        resolvedPatientId: null,
        resolvedByEmployeeId: null,
        resolvedAt: null,
      },
    })).toBe(true);
  });

  it("rejects an appointment with neither Patient nor provisional guest contact", () => {
    expect(isGuestAppointmentIdentityConsistent({ appointmentPatientId: null, guestContact: null })).toBe(false);
  });

  it("accepts a normal patient appointment without guest contact", () => {
    expect(isGuestAppointmentIdentityConsistent({ appointmentPatientId: "patient_1", guestContact: null })).toBe(true);
  });

  it("accepts a guest appointment linked to the same Patient after staff verification", () => {
    expect(isGuestAppointmentIdentityConsistent({
      appointmentPatientId: "patient_1",
      guestContact: {
        resolutionStatus: "LINKED",
        resolvedPatientId: "patient_1",
        resolvedByEmployeeId: "employee_reception",
        resolvedAt: linkedAt,
      },
      hasMatchingVerifiedIdentityCheck: true,
    })).toBe(true);
  });

  it("rejects a guest link without a matching two-element verification event", () => {
    expect(isGuestAppointmentIdentityConsistent({
      appointmentPatientId: "patient_1",
      guestContact: {
        resolutionStatus: "LINKED",
        resolvedPatientId: "patient_1",
        resolvedByEmployeeId: "employee_reception",
        resolvedAt: linkedAt,
      },
      hasMatchingVerifiedIdentityCheck: false,
    })).toBe(false);
  });

  it("rejects a guest contact resolved to a different Patient", () => {
    expect(isGuestAppointmentIdentityConsistent({
      appointmentPatientId: "patient_1",
      guestContact: {
        resolutionStatus: "LINKED",
        resolvedPatientId: "patient_2",
        resolvedByEmployeeId: "employee_reception",
        resolvedAt: linkedAt,
      },
      hasMatchingVerifiedIdentityCheck: true,
    })).toBe(false);
  });

  it("rejects a pending guest contact attached to a Patient", () => {
    expect(isGuestAppointmentIdentityConsistent({
      appointmentPatientId: "patient_1",
      guestContact: {
        resolutionStatus: "PENDING_VERIFICATION",
        resolvedPatientId: null,
        resolvedByEmployeeId: null,
        resolvedAt: null,
      },
    })).toBe(false);
  });
});
