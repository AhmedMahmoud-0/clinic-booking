import { describe, expect, it } from "vitest";
import {
  isReceptionAppointmentEligibleForNoShow,
  isReceptionNoShowActor,
  RECEPTION_NO_SHOW_GRACE_PERIOD_MS,
  type ReceptionNoShowEligibilityInput,
} from "../../src/server/appointments/reception-appointment-no-show-policy";

const startsAt = new Date("2026-11-09T10:00:00.000Z");
const nowAfterGrace = new Date(startsAt.getTime() + RECEPTION_NO_SHOW_GRACE_PERIOD_MS + 1);

function eligibleInput(overrides: Partial<ReceptionNoShowEligibilityInput> = {}): ReceptionNoShowEligibilityInput {
  return {
    employeeStatus: "ACTIVE",
    activeRoles: ["RECEPTION"],
    source: "PATIENT_PORTAL",
    patientId: "patient_1",
    status: "CONFIRMED",
    startsAt,
    checkedInAt: null,
    cancelledAt: null,
    completedAt: null,
    queueEntryExists: false,
    guestContactExists: false,
    guestResolutionStatus: null,
    guestResolvedPatientId: null,
    now: nowAfterGrace,
    ...overrides,
  };
}

describe("Reception appointment no-show policy", () => {
  it("accepts an active Reception employee", () => {
    expect(isReceptionNoShowActor({ employeeStatus: "ACTIVE", activeRoles: ["RECEPTION"] })).toBe(true);
  });

  it("rejects an inactive employee", () => {
    expect(isReceptionNoShowActor({ employeeStatus: "INACTIVE", activeRoles: ["RECEPTION"] })).toBe(false);
  });

  it("rejects an employee without an active Reception assignment", () => {
    expect(isReceptionNoShowActor({ employeeStatus: "ACTIVE", activeRoles: ["DOCTOR"] })).toBe(false);
  });

  it("allows an unarrived confirmed patient appointment after the full grace period", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput())).toBe(true);
  });

  it("does not allow no-show at the exact 10-minute grace boundary", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({
      now: new Date(startsAt.getTime() + RECEPTION_NO_SHOW_GRACE_PERIOD_MS),
    }))).toBe(false);
  });

  it("does not allow no-show before the appointment starts", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({
      now: new Date(startsAt.getTime() - 1),
    }))).toBe(false);
  });

  it("allows an overdue appointment to be marked later because no same-day restriction is defined", () => {
    const olderStart = new Date("2026-11-08T10:00:00.000Z");
    const laterNow = new Date("2026-11-09T10:00:00.000Z");
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({
      startsAt: olderStart,
      now: laterNow,
    }))).toBe(true);
  });

  it("does not allow a non-confirmed appointment", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({ status: "CHECKED_IN" }))).toBe(false);
  });

  it("does not allow an appointment with checkedInAt", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({ checkedInAt: nowAfterGrace }))).toBe(false);
  });

  it("does not allow an appointment that already has a queue entry", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({ queueEntryExists: true }))).toBe(false);
  });

  it("does not allow cancelled appointments", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({ cancelledAt: nowAfterGrace }))).toBe(false);
  });

  it("does not allow appointments with a completion timestamp", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({ completedAt: nowAfterGrace }))).toBe(false);
  });

  it("allows an unresolved public guest appointment with a pending guest contact", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({
      source: "PUBLIC_WEBSITE",
      patientId: null,
      guestContactExists: true,
      guestResolutionStatus: "PENDING_VERIFICATION",
      guestResolvedPatientId: null,
    }))).toBe(true);
  });

  it("allows a resolved public guest appointment only when the linked patient matches", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({
      source: "PUBLIC_WEBSITE",
      guestContactExists: true,
      guestResolutionStatus: "LINKED",
      guestResolvedPatientId: "patient_1",
    }))).toBe(true);
  });

  it("rejects a public guest whose resolved patient does not match the appointment", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({
      source: "PUBLIC_WEBSITE",
      guestContactExists: true,
      guestResolutionStatus: "LINKED",
      guestResolvedPatientId: "patient_other",
    }))).toBe(false);
  });

  it("rejects public guest appointments missing their guest contact", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({
      source: "PUBLIC_WEBSITE",
      patientId: null,
      guestContactExists: false,
    }))).toBe(false);
  });

  it("rejects a Patient Portal appointment carrying a guest contact", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({ guestContactExists: true }))).toBe(false);
  });

  it("rejects an unsupported appointment source", () => {
    expect(isReceptionAppointmentEligibleForNoShow(eligibleInput({ source: "UNKNOWN" }))).toBe(false);
  });
});
