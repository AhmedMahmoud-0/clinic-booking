import { describe, expect, it } from "vitest";
import {
  getReceptionArrivalDecision,
  isReceptionAppointmentEligibleForCheckIn,
  isReceptionCheckInActor,
  RECEPTION_CHECK_IN_EARLY_TARGET_MS,
  RECEPTION_CHECK_IN_GRACE_PERIOD_MS,
} from "../../src/server/appointments/reception-appointment-check-in-policy";

const startsAt = new Date("2026-11-09T10:00:00.000Z");
const now = new Date("2026-11-09T09:55:00.000Z");

function eligibilityInput(overrides: Partial<Parameters<typeof isReceptionAppointmentEligibleForCheckIn>[0]> = {}) {
  return {
    employeeStatus: "ACTIVE",
    activeRoles: ["RECEPTION"],
    source: "PATIENT_PORTAL",
    patientId: "patient_demo_1",
    patientIsActive: true,
    status: "CONFIRMED",
    checkedInAt: null,
    cancelledAt: null,
    queueEntryExists: false,
    guestContactExists: false,
    guestResolutionStatus: null,
    guestResolvedPatientId: null,
    appointmentLocalDate: "2026-11-09",
    currentLocalDate: "2026-11-09",
    ...overrides,
  };
}

describe("Reception appointment check-in policy", () => {
  it("requires an active Reception assignment", () => {
    expect(isReceptionCheckInActor({ employeeStatus: "ACTIVE", activeRoles: ["RECEPTION"] })).toBe(true);
    expect(isReceptionCheckInActor({ employeeStatus: "INACTIVE", activeRoles: ["RECEPTION"] })).toBe(false);
    expect(isReceptionCheckInActor({ employeeStatus: "ACTIVE", activeRoles: ["CLINIC_MANAGER"] })).toBe(false);
  });

  it("allows a confirmed Patient Portal appointment for an active patient today", () => {
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput())).toBe(true);
  });

  it("allows a Reception-created appointment when the Patient link is active", () => {
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({ source: "RECEPTION" }))).toBe(true);
  });

  it("allows a public guest appointment only after a consistent Patient link is established", () => {
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({
      source: "PUBLIC_WEBSITE",
      guestContactExists: true,
      guestResolutionStatus: "LINKED",
      guestResolvedPatientId: "patient_demo_1",
    }))).toBe(true);
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({
      source: "PUBLIC_WEBSITE",
      guestContactExists: true,
      guestResolutionStatus: "PENDING_VERIFICATION",
      guestResolvedPatientId: null,
    }))).toBe(false);
  });

  it("rejects missing, inactive, or mismatched Patient identity links", () => {
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({ patientId: null }))).toBe(false);
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({ patientIsActive: false }))).toBe(false);
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({
      source: "PUBLIC_WEBSITE",
      guestContactExists: true,
      guestResolutionStatus: "LINKED",
      guestResolvedPatientId: "different_patient",
    }))).toBe(false);
  });

  it("rejects non-confirmed, already checked-in, or already queued appointments", () => {
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({ status: "CHECKED_IN" }))).toBe(false);
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({ checkedInAt: startsAt }))).toBe(false);
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({ cancelledAt: startsAt }))).toBe(false);
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({ queueEntryExists: true }))).toBe(false);
  });

  it("requires the appointment Cairo-local date to match the current clinic date", () => {
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({
      appointmentLocalDate: "2026-11-10",
    }))).toBe(false);
    expect(isReceptionAppointmentEligibleForCheckIn(eligibilityInput({
      currentLocalDate: "not-a-date",
    }))).toBe(false);
  });

  it("classifies arrival more than 15 minutes early and within the early target", () => {
    expect(getReceptionArrivalDecision({
      startsAt,
      now: new Date(startsAt.getTime() - RECEPTION_CHECK_IN_EARLY_TARGET_MS - 1),
      lateArrivalAccepted: false,
    })).toBe("EARLY");
    expect(getReceptionArrivalDecision({
      startsAt,
      now: new Date(startsAt.getTime() - RECEPTION_CHECK_IN_EARLY_TARGET_MS),
      lateArrivalAccepted: false,
    })).toBe("EARLY_WITHIN_TARGET");
  });

  it("keeps the exact 10-minute boundary inside the grace period", () => {
    expect(getReceptionArrivalDecision({
      startsAt,
      now: new Date(startsAt.getTime() + RECEPTION_CHECK_IN_GRACE_PERIOD_MS),
      lateArrivalAccepted: false,
    })).toBe("WITHIN_GRACE");
  });

  it("requires an explicit Reception decision after the grace period", () => {
    const late = new Date(startsAt.getTime() + RECEPTION_CHECK_IN_GRACE_PERIOD_MS + 1);
    expect(getReceptionArrivalDecision({ startsAt, now: late, lateArrivalAccepted: false })).toBe("LATE_DECISION_REQUIRED");
    expect(getReceptionArrivalDecision({ startsAt, now: late, lateArrivalAccepted: true })).toBe("LATE_ACCEPTED");
  });

  it("rejects a late-arrival acceptance flag inside the grace period and invalid instants", () => {
    expect(getReceptionArrivalDecision({ startsAt, now, lateArrivalAccepted: true })).toBe("UNEXPECTED_LATE_ACCEPTANCE");
    expect(getReceptionArrivalDecision({ startsAt: new Date(Number.NaN), now, lateArrivalAccepted: false })).toBe("INVALID_TIME");
  });
});
