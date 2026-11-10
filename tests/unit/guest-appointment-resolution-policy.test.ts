import { describe, expect, it } from "vitest";
import { isGuestAppointmentPendingResolution } from "../../src/server/appointments/guest-appointment-resolution-policy";

const validState = {
  source: "PUBLIC_WEBSITE",
  status: "CONFIRMED",
  patientId: null,
  guestContact: {
    resolutionStatus: "PENDING_VERIFICATION",
    resolvedPatientId: null,
  },
};

describe("guest appointment resolution policy", () => {
  it("accepts an unresolved confirmed public guest appointment", () => {
    expect(isGuestAppointmentPendingResolution(validState)).toBe(true);
  });

  it("rejects a patient-portal appointment", () => {
    expect(isGuestAppointmentPendingResolution({ ...validState, source: "PATIENT_PORTAL" })).toBe(false);
  });

  it("rejects a Reception-created appointment", () => {
    expect(isGuestAppointmentPendingResolution({ ...validState, source: "RECEPTION" })).toBe(false);
  });

  it("rejects an appointment that already has a Patient", () => {
    expect(isGuestAppointmentPendingResolution({ ...validState, patientId: "patient_1" })).toBe(false);
  });

  it("rejects a guest contact that is already linked", () => {
    expect(isGuestAppointmentPendingResolution({
      ...validState,
      guestContact: { resolutionStatus: "LINKED", resolvedPatientId: "patient_1" },
    })).toBe(false);
  });

  it("rejects an appointment without a guest contact", () => {
    expect(isGuestAppointmentPendingResolution({ ...validState, guestContact: null })).toBe(false);
  });

  it("rejects cancelled appointments", () => {
    expect(isGuestAppointmentPendingResolution({ ...validState, status: "CANCELLED" })).toBe(false);
  });

  it("rejects no-show appointments", () => {
    expect(isGuestAppointmentPendingResolution({ ...validState, status: "NO_SHOW" })).toBe(false);
  });
});
