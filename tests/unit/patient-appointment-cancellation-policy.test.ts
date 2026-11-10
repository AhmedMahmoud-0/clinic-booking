import { describe, expect, it } from "vitest";
import {
  isPatientSelfCancellationAllowed,
  PATIENT_SELF_SERVICE_CANCELLATION_WINDOW_MS,
} from "../../src/server/appointments/patient-appointment-cancellation-policy";

const now = new Date("2026-11-09T10:00:00.000Z");

function input(overrides: Partial<Parameters<typeof isPatientSelfCancellationAllowed>[0]> = {}) {
  return {
    patientId: "patient_demo_id",
    status: "CONFIRMED",
    startsAt: new Date(now.getTime() + PATIENT_SELF_SERVICE_CANCELLATION_WINDOW_MS),
    now,
    ...overrides,
  };
}

describe("patient self-service cancellation policy", () => {
  it("allows cancellation at the exact 24-hour boundary", () => {
    expect(isPatientSelfCancellationAllowed(input())).toBe(true);
  });

  it("allows cancellation more than 24 hours ahead", () => {
    expect(isPatientSelfCancellationAllowed(input({
      startsAt: new Date(now.getTime() + PATIENT_SELF_SERVICE_CANCELLATION_WINDOW_MS + 1),
    }))).toBe(true);
  });

  it("rejects cancellation one millisecond inside the 24-hour window", () => {
    expect(isPatientSelfCancellationAllowed(input({
      startsAt: new Date(now.getTime() + PATIENT_SELF_SERVICE_CANCELLATION_WINDOW_MS - 1),
    }))).toBe(false);
  });

  it("rejects cancellation for an appointment in the past", () => {
    expect(isPatientSelfCancellationAllowed(input({
      startsAt: new Date(now.getTime() - 1),
    }))).toBe(false);
  });

  it("rejects an appointment without a linked Patient", () => {
    expect(isPatientSelfCancellationAllowed(input({ patientId: null }))).toBe(false);
  });

  it("rejects a blank Patient ID", () => {
    expect(isPatientSelfCancellationAllowed(input({ patientId: " " }))).toBe(false);
  });

  it("rejects already-cancelled appointments", () => {
    expect(isPatientSelfCancellationAllowed(input({ status: "CANCELLED" }))).toBe(false);
  });

  it("rejects checked-in appointments", () => {
    expect(isPatientSelfCancellationAllowed(input({ status: "CHECKED_IN" }))).toBe(false);
  });

  it("rejects waiting and in-consultation appointments", () => {
    expect(isPatientSelfCancellationAllowed(input({ status: "WAITING" }))).toBe(false);
    expect(isPatientSelfCancellationAllowed(input({ status: "IN_CONSULTATION" }))).toBe(false);
  });

  it("rejects completed and no-show appointments", () => {
    expect(isPatientSelfCancellationAllowed(input({ status: "COMPLETED" }))).toBe(false);
    expect(isPatientSelfCancellationAllowed(input({ status: "NO_SHOW" }))).toBe(false);
  });
});
