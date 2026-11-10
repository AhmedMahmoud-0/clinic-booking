import { describe, expect, it } from "vitest";
import {
  GUEST_SELF_SERVICE_CANCELLATION_WINDOW_MS,
  isGuestSelfServiceCancellationAllowed,
  type GuestSelfCancellationPolicyInput,
} from "../../src/server/appointments/guest-appointment-cancellation-policy";

const now = new Date("2026-11-09T00:00:00.000Z");

function makeInput(
  overrides: Partial<GuestSelfCancellationPolicyInput> = {},
): GuestSelfCancellationPolicyInput {
  return {
    source: "PUBLIC_WEBSITE",
    patientId: null,
    status: "CONFIRMED",
    startsAt: new Date(now.getTime() + GUEST_SELF_SERVICE_CANCELLATION_WINDOW_MS),
    cancelledAt: null,
    resolutionStatus: "PENDING_VERIFICATION",
    resolvedPatientId: null,
    now,
    ...overrides,
  };
}

describe("guest self-service cancellation policy", () => {
  it("allows an unresolved public guest booking at the exact 24-hour boundary", () => {
    expect(isGuestSelfServiceCancellationAllowed(makeInput())).toBe(true);
  });

  it("allows cancellation more than 24 hours before the appointment", () => {
    expect(isGuestSelfServiceCancellationAllowed(makeInput({
      startsAt: new Date(now.getTime() + GUEST_SELF_SERVICE_CANCELLATION_WINDOW_MS + 1),
    }))).toBe(true);
  });

  it("rejects cancellation inside the final 24 hours", () => {
    expect(isGuestSelfServiceCancellationAllowed(makeInput({
      startsAt: new Date(now.getTime() + GUEST_SELF_SERVICE_CANCELLATION_WINDOW_MS - 1),
    }))).toBe(false);
  });

  it("rejects an appointment whose start instant has passed", () => {
    expect(isGuestSelfServiceCancellationAllowed(makeInput({
      startsAt: new Date(now.getTime() - 1),
    }))).toBe(false);
  });

  it("accepts only public-website guest appointments", () => {
    expect(isGuestSelfServiceCancellationAllowed(makeInput({ source: "PATIENT_PORTAL" }))).toBe(false);
    expect(isGuestSelfServiceCancellationAllowed(makeInput({ source: "RECEPTION" }))).toBe(false);
  });

  it("rejects an appointment already linked to a Patient", () => {
    expect(isGuestSelfServiceCancellationAllowed(makeInput({ patientId: "patient_1" }))).toBe(false);
  });

  it("requires a confirmed appointment", () => {
    expect(isGuestSelfServiceCancellationAllowed(makeInput({ status: "CANCELLED" }))).toBe(false);
    expect(isGuestSelfServiceCancellationAllowed(makeInput({ status: "CHECKED_IN" }))).toBe(false);
  });

  it("rejects an appointment that already has a cancellation timestamp", () => {
    expect(isGuestSelfServiceCancellationAllowed(makeInput({ cancelledAt: new Date(now) }))).toBe(false);
  });

  it("requires the guest contact to remain pending verification", () => {
    expect(isGuestSelfServiceCancellationAllowed(makeInput({ resolutionStatus: "LINKED" }))).toBe(false);
  });

  it("rejects a guest contact with a resolved Patient", () => {
    expect(isGuestSelfServiceCancellationAllowed(makeInput({ resolvedPatientId: "patient_1" }))).toBe(false);
  });
});
