import { describe, expect, it } from "vitest";
import {
  getReceptionAppointmentChangeWindow,
  isReceptionAppointmentActor,
  isReceptionAppointmentChangeAllowed,
  RECEPTION_LATE_CHANGE_WINDOW_MS,
} from "../../src/server/appointments/reception-appointment-change-policy";

const now = new Date("2026-11-09T10:00:00.000Z");

function input(overrides: Partial<Parameters<typeof isReceptionAppointmentChangeAllowed>[0]> = {}) {
  return {
    employeeStatus: "ACTIVE",
    activeRoles: ["RECEPTION"],
    source: "PATIENT_PORTAL",
    patientId: "patient_demo_1",
    patientIsActive: true,
    status: "CONFIRMED",
    startsAt: new Date(now.getTime() + RECEPTION_LATE_CHANGE_WINDOW_MS),
    cancelledAt: null,
    guestContactExists: false,
    guestResolutionStatus: null,
    guestResolvedPatientId: null,
    now,
    ...overrides,
  };
}

describe("Reception appointment change policy", () => {
  it("requires an active Reception employee", () => {
    expect(isReceptionAppointmentActor({ employeeStatus: "ACTIVE", activeRoles: ["RECEPTION"] })).toBe(true);
    expect(isReceptionAppointmentActor({ employeeStatus: "INACTIVE", activeRoles: ["RECEPTION"] })).toBe(false);
    expect(isReceptionAppointmentActor({ employeeStatus: "ACTIVE", activeRoles: ["CLINIC_MANAGER"] })).toBe(false);
  });

  it("allows an upcoming confirmed active-patient appointment", () => {
    expect(isReceptionAppointmentChangeAllowed(input())).toBe(true);
  });

  it("allows a pending unresolved public guest appointment", () => {
    expect(isReceptionAppointmentChangeAllowed(input({
      source: "PUBLIC_WEBSITE",
      patientId: null,
      patientIsActive: false,
      guestContactExists: true,
      guestResolutionStatus: "PENDING_VERIFICATION",
      guestResolvedPatientId: null,
    }))).toBe(true);
  });

  it("allows a public guest appointment only when its linked patient agrees with the guest contact", () => {
    expect(isReceptionAppointmentChangeAllowed(input({
      source: "PUBLIC_WEBSITE",
      guestContactExists: true,
      guestResolutionStatus: "LINKED",
      guestResolvedPatientId: "patient_demo_1",
    }))).toBe(true);
    expect(isReceptionAppointmentChangeAllowed(input({
      source: "PUBLIC_WEBSITE",
      guestContactExists: true,
      guestResolutionStatus: "LINKED",
      guestResolvedPatientId: "different_patient",
    }))).toBe(false);
  });

  it("rejects non-Reception roles, inactive patients, and malformed guest state", () => {
    expect(isReceptionAppointmentChangeAllowed(input({ activeRoles: ["CLINIC_MANAGER"] }))).toBe(false);
    expect(isReceptionAppointmentChangeAllowed(input({ patientIsActive: false }))).toBe(false);
    expect(isReceptionAppointmentChangeAllowed(input({ source: "PUBLIC_WEBSITE", guestContactExists: false }))).toBe(false);
  });

  it("rejects non-confirmed or already-cancelled appointments", () => {
    expect(isReceptionAppointmentChangeAllowed(input({ status: "CHECKED_IN" }))).toBe(false);
    expect(isReceptionAppointmentChangeAllowed(input({ status: "CANCELLED" }))).toBe(false);
    expect(isReceptionAppointmentChangeAllowed(input({ cancelledAt: new Date(now.getTime() - 1000) }))).toBe(false);
  });

  it("rejects completed, no-show, past, and current-time appointments", () => {
    expect(isReceptionAppointmentChangeAllowed(input({ status: "COMPLETED" }))).toBe(false);
    expect(isReceptionAppointmentChangeAllowed(input({ status: "NO_SHOW" }))).toBe(false);
    expect(isReceptionAppointmentChangeAllowed(input({ startsAt: new Date(now.getTime() - 1) }))).toBe(false);
    expect(isReceptionAppointmentChangeAllowed(input({ startsAt: now }))).toBe(false);
  });

  it("requires a linked active patient for patient-portal and Reception bookings", () => {
    expect(isReceptionAppointmentChangeAllowed(input({ patientId: null }))).toBe(false);
    expect(isReceptionAppointmentChangeAllowed(input({ source: "RECEPTION", patientId: null }))).toBe(false);
    expect(isReceptionAppointmentChangeAllowed(input({ source: "PATIENT_PORTAL", guestContactExists: true }))).toBe(false);
  });

  it("classifies the exact 24-hour boundary as standard and the inside as late", () => {
    expect(getReceptionAppointmentChangeWindow(
      new Date(now.getTime() + RECEPTION_LATE_CHANGE_WINDOW_MS), now,
    )).toBe("STANDARD");
    expect(getReceptionAppointmentChangeWindow(
      new Date(now.getTime() + RECEPTION_LATE_CHANGE_WINDOW_MS - 1), now,
    )).toBe("LATE");
  });

  it("does not classify past or invalid instants", () => {
    expect(getReceptionAppointmentChangeWindow(new Date(now.getTime() - 1), now)).toBeNull();
    expect(getReceptionAppointmentChangeWindow(new Date(Number.NaN), now)).toBeNull();
  });
});
