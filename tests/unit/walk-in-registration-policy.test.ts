import { describe, expect, it } from "vitest";
import {
  decideQueueCallNext,
  decideWalkInRegistration,
  isWalkInReceptionActor,
} from "../../src/server/appointments/walk-in-registration-policy";

const baseEligibility = {
  employeeStatus: "ACTIVE",
  activeRoles: ["RECEPTION"],
  patientIsActive: true,
  doctorIsActive: true,
  clinicIsOpen: true,
  doctorIsScheduled: true,
  doctorHasOngoingAppointment: false,
  doctorHasInServiceTicket: false,
  patientHasBlockingAppointment: false,
  patientHasActiveQueueEntry: false,
};

describe("Reception walk-in registration policy", () => {
  it("requires an active Reception employee", () => {
    expect(isWalkInReceptionActor({ employeeStatus: "ACTIVE", activeRoles: ["RECEPTION"] })).toBe(true);
    expect(isWalkInReceptionActor({ employeeStatus: "ON_LEAVE", activeRoles: ["RECEPTION"] })).toBe(false);
    expect(isWalkInReceptionActor({ employeeStatus: "ACTIVE", activeRoles: ["DOCTOR"] })).toBe(false);
  });

  it("allows only an eligible existing active patient and active doctor during configured open hours", () => {
    expect(decideWalkInRegistration(baseEligibility)).toEqual({ allowed: true });
  });

  it("rejects an inactive patient", () => {
    expect(decideWalkInRegistration({ ...baseEligibility, patientIsActive: false })).toEqual({ allowed: false, code: "ACTIVE_PATIENT_REQUIRED" });
  });

  it("rejects an inactive doctor", () => {
    expect(decideWalkInRegistration({ ...baseEligibility, doctorIsActive: false })).toEqual({ allowed: false, code: "ACTIVE_DOCTOR_REQUIRED" });
  });

  it("rejects walk-ins while the clinic is closed", () => {
    expect(decideWalkInRegistration({ ...baseEligibility, clinicIsOpen: false })).toEqual({ allowed: false, code: "CLINIC_CLOSED" });
  });

  it("rejects a doctor outside configured working hours", () => {
    expect(decideWalkInRegistration({ ...baseEligibility, doctorIsScheduled: false })).toEqual({ allowed: false, code: "DOCTOR_NOT_SCHEDULED" });
  });

  it("does not displace an ongoing appointment or in-service ticket", () => {
    expect(decideWalkInRegistration({ ...baseEligibility, doctorHasOngoingAppointment: true })).toEqual({ allowed: false, code: "DOCTOR_BUSY" });
    expect(decideWalkInRegistration({ ...baseEligibility, doctorHasInServiceTicket: true })).toEqual({ allowed: false, code: "DOCTOR_BUSY" });
  });

  it("rejects a walk-in when the same patient has a current-day appointment with that doctor", () => {
    expect(decideWalkInRegistration({ ...baseEligibility, patientHasBlockingAppointment: true })).toEqual({ allowed: false, code: "PATIENT_HAS_APPOINTMENT" });
  });

  it("rejects duplicate active queue tickets for the same patient and doctor", () => {
    expect(decideWalkInRegistration({ ...baseEligibility, patientHasActiveQueueEntry: true })).toEqual({ allowed: false, code: "PATIENT_ALREADY_QUEUED" });
  });

  it("calls the current appointment ticket idempotently", () => {
    expect(decideQueueCallNext({
      currentCalledEntry: { id: "appointment-called", type: "APPOINTMENT" },
      nextWaitingAppointment: { id: "appointment-next", patientIsActive: true },
      nextWaitingWalkIn: { id: "walk-in-next", patientIsActive: true },
      hasUnfinishedConfirmedAppointment: true,
    })).toEqual({ kind: "RETURN_CURRENT_APPOINTMENT_CALL", queueEntryId: "appointment-called" });
  });

  it("prioritizes a waiting appointment over a waiting walk-in", () => {
    expect(decideQueueCallNext({
      currentCalledEntry: null,
      nextWaitingAppointment: { id: "appointment-next", patientIsActive: true },
      nextWaitingWalkIn: { id: "walk-in-next", patientIsActive: true },
      hasUnfinishedConfirmedAppointment: true,
    })).toEqual({ kind: "CALL_APPOINTMENT", queueEntryId: "appointment-next" });
  });

  it("holds walk-ins while a confirmed appointment has not ended", () => {
    expect(decideQueueCallNext({
      currentCalledEntry: null,
      nextWaitingAppointment: null,
      nextWaitingWalkIn: { id: "walk-in-next", patientIsActive: true },
      hasUnfinishedConfirmedAppointment: true,
    })).toEqual({ kind: "SCHEDULED_APPOINTMENTS_PENDING" });
  });

  it("defers a called walk-in when a scheduled appointment becomes eligible", () => {
    expect(decideQueueCallNext({
      currentCalledEntry: { id: "walk-in-called", type: "WALK_IN" },
      nextWaitingAppointment: { id: "appointment-next", patientIsActive: true },
      nextWaitingWalkIn: null,
      hasUnfinishedConfirmedAppointment: false,
    })).toEqual({ kind: "DEFER_CURRENT_WALK_IN", queueEntryId: "walk-in-called" });
  });

  it("blocks rather than skipping an inactive appointment at the head of the priority queue", () => {
    expect(decideQueueCallNext({
      currentCalledEntry: null,
      nextWaitingAppointment: { id: "inactive-appointment", patientIsActive: false },
      nextWaitingWalkIn: { id: "walk-in-next", patientIsActive: true },
      hasUnfinishedConfirmedAppointment: false,
    })).toEqual({ kind: "BLOCK_INACTIVE_PATIENT", queueEntryId: "inactive-appointment" });
  });

  it("calls a walk-in only after appointment priority is clear", () => {
    expect(decideQueueCallNext({
      currentCalledEntry: null,
      nextWaitingAppointment: null,
      nextWaitingWalkIn: { id: "walk-in-next", patientIsActive: true },
      hasUnfinishedConfirmedAppointment: false,
    })).toEqual({ kind: "CALL_WALK_IN", queueEntryId: "walk-in-next" });
  });

  it("blocks an inactive walk-in without skipping it", () => {
    expect(decideQueueCallNext({
      currentCalledEntry: null,
      nextWaitingAppointment: null,
      nextWaitingWalkIn: { id: "inactive-walk-in", patientIsActive: false },
      hasUnfinishedConfirmedAppointment: false,
    })).toEqual({ kind: "BLOCK_INACTIVE_PATIENT", queueEntryId: "inactive-walk-in" });
  });
});
