import { describe, expect, it } from "vitest";
import {
  isPatientSelfReschedulingAllowed,
  PATIENT_SELF_SERVICE_RESCHEDULING_WINDOW_MS,
} from "../../src/server/appointments/patient-appointment-rescheduling-policy";

const now = new Date("2026-11-09T10:00:00.000Z");
const currentStartsAt = new Date(now.getTime() + PATIENT_SELF_SERVICE_RESCHEDULING_WINDOW_MS);
const requestedStartsAt = new Date(now.getTime() + 3 * PATIENT_SELF_SERVICE_RESCHEDULING_WINDOW_MS);

function input(overrides: Partial<Parameters<typeof isPatientSelfReschedulingAllowed>[0]> = {}) {
  return {
    patientId: "patient_demo_id",
    status: "CONFIRMED",
    currentStartsAt,
    requestedStartsAt,
    now,
    ...overrides,
  };
}

describe("patient self-service rescheduling policy", () => {
  it("allows rescheduling at the exact 24-hour boundary", () => {
    expect(isPatientSelfReschedulingAllowed(input())).toBe(true);
  });

  it("allows rescheduling more than 24 hours before the existing appointment", () => {
    expect(isPatientSelfReschedulingAllowed(input({
      currentStartsAt: new Date(now.getTime() + PATIENT_SELF_SERVICE_RESCHEDULING_WINDOW_MS + 1),
    }))).toBe(true);
  });

  it("rejects rescheduling one millisecond inside the 24-hour window", () => {
    expect(isPatientSelfReschedulingAllowed(input({
      currentStartsAt: new Date(now.getTime() + PATIENT_SELF_SERVICE_RESCHEDULING_WINDOW_MS - 1),
    }))).toBe(false);
  });

  it("rejects an existing appointment that is already in the past", () => {
    expect(isPatientSelfReschedulingAllowed(input({
      currentStartsAt: new Date(now.getTime() - 1),
    }))).toBe(false);
  });

  it("rejects a replacement slot in the past", () => {
    expect(isPatientSelfReschedulingAllowed(input({
      requestedStartsAt: new Date(now.getTime() - 1),
    }))).toBe(false);
  });

  it("rejects a no-op reschedule to the same instant", () => {
    expect(isPatientSelfReschedulingAllowed(input({
      requestedStartsAt: currentStartsAt,
    }))).toBe(false);
  });

  it("rejects an appointment without a linked Patient", () => {
    expect(isPatientSelfReschedulingAllowed(input({ patientId: null }))).toBe(false);
  });

  it("rejects a blank Patient ID", () => {
    expect(isPatientSelfReschedulingAllowed(input({ patientId: " " }))).toBe(false);
  });

  it("rejects a cancelled appointment", () => {
    expect(isPatientSelfReschedulingAllowed(input({ status: "CANCELLED" }))).toBe(false);
  });

  it("rejects checked-in, waiting, or in-consultation appointments", () => {
    expect(isPatientSelfReschedulingAllowed(input({ status: "CHECKED_IN" }))).toBe(false);
    expect(isPatientSelfReschedulingAllowed(input({ status: "WAITING" }))).toBe(false);
    expect(isPatientSelfReschedulingAllowed(input({ status: "IN_CONSULTATION" }))).toBe(false);
  });

  it("rejects completed and no-show appointments", () => {
    expect(isPatientSelfReschedulingAllowed(input({ status: "COMPLETED" }))).toBe(false);
    expect(isPatientSelfReschedulingAllowed(input({ status: "NO_SHOW" }))).toBe(false);
  });

  it("rejects invalid date values", () => {
    expect(isPatientSelfReschedulingAllowed(input({
      currentStartsAt: new Date(Number.NaN),
    }))).toBe(false);
    expect(isPatientSelfReschedulingAllowed(input({
      requestedStartsAt: new Date(Number.NaN),
    }))).toBe(false);
  });
});
