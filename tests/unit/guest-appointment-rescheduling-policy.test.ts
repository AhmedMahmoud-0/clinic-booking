import { describe, expect, it } from "vitest";
import {
  GUEST_SELF_SERVICE_RESCHEDULING_WINDOW_MS,
  isGuestSelfServiceReschedulingAllowed,
  type GuestSelfReschedulingPolicyInput,
} from "../../src/server/appointments/guest-appointment-rescheduling-policy";

const now = new Date("2026-11-09T00:00:00.000Z");
const currentStartsAt = new Date(now.getTime() + GUEST_SELF_SERVICE_RESCHEDULING_WINDOW_MS);
const requestedStartsAt = new Date(now.getTime() + 3 * GUEST_SELF_SERVICE_RESCHEDULING_WINDOW_MS);

function makeInput(
  overrides: Partial<GuestSelfReschedulingPolicyInput> = {},
): GuestSelfReschedulingPolicyInput {
  return {
    source: "PUBLIC_WEBSITE",
    patientId: null,
    status: "CONFIRMED",
    currentStartsAt,
    requestedStartsAt,
    cancelledAt: null,
    resolutionStatus: "PENDING_VERIFICATION",
    resolvedPatientId: null,
    now,
    ...overrides,
  };
}

describe("guest self-service rescheduling policy", () => {
  it("allows rescheduling at the exact 24-hour boundary", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput())).toBe(true);
  });

  it("allows rescheduling more than 24 hours before the existing appointment", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({
      currentStartsAt: new Date(now.getTime() + GUEST_SELF_SERVICE_RESCHEDULING_WINDOW_MS + 1),
    }))).toBe(true);
  });

  it("rejects rescheduling one millisecond inside the 24-hour window", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({
      currentStartsAt: new Date(now.getTime() + GUEST_SELF_SERVICE_RESCHEDULING_WINDOW_MS - 1),
    }))).toBe(false);
  });

  it("rejects an existing appointment whose start instant has passed", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({
      currentStartsAt: new Date(now.getTime() - 1),
    }))).toBe(false);
  });

  it("rejects a replacement slot in the past", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({
      requestedStartsAt: new Date(now.getTime() - 1),
    }))).toBe(false);
  });

  it("rejects a replacement slot equal to the current appointment start", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({
      requestedStartsAt: currentStartsAt,
    }))).toBe(false);
  });

  it("accepts only public-website guest appointments", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({ source: "PATIENT_PORTAL" }))).toBe(false);
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({ source: "RECEPTION" }))).toBe(false);
  });

  it("rejects an appointment already linked to a Patient", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({ patientId: "patient_1" }))).toBe(false);
  });

  it("requires a confirmed appointment", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({ status: "CANCELLED" }))).toBe(false);
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({ status: "CHECKED_IN" }))).toBe(false);
  });

  it("rejects an appointment with a cancellation timestamp", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({ cancelledAt: new Date(now) }))).toBe(false);
  });

  it("requires the guest contact to remain pending verification", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({ resolutionStatus: "LINKED" }))).toBe(false);
  });

  it("rejects a guest contact with a resolved Patient", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({ resolvedPatientId: "patient_1" }))).toBe(false);
  });

  it("rejects invalid date values", () => {
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({
      currentStartsAt: new Date(Number.NaN),
    }))).toBe(false);
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({
      requestedStartsAt: new Date(Number.NaN),
    }))).toBe(false);
    expect(isGuestSelfServiceReschedulingAllowed(makeInput({
      now: new Date(Number.NaN),
    }))).toBe(false);
  });
});
