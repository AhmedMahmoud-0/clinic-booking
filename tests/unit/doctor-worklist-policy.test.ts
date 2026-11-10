import { describe, expect, it } from "vitest";
import {
  getDoctorQueueWaitingMinutes,
  isActiveDoctorWorklistActor,
  resolveDoctorWorklistEncounter,
  summarizeDoctorWorklist,
} from "../../src/server/appointments/doctor-worklist-policy";

describe("Doctor worklist policy", () => {
  it("requires an active employee with an active Doctor role", () => {
    expect(isActiveDoctorWorklistActor({ employeeStatus: "ACTIVE", activeRoles: ["DOCTOR"] })).toBe(true);
    expect(isActiveDoctorWorklistActor({ employeeStatus: "INACTIVE", activeRoles: ["DOCTOR"] })).toBe(false);
    expect(isActiveDoctorWorklistActor({ employeeStatus: "ACTIVE", activeRoles: ["RECEPTION"] })).toBe(false);
    expect(isActiveDoctorWorklistActor({ employeeStatus: "ACTIVE", activeRoles: [] })).toBe(false);
  });

  it("summarizes every persisted queue status", () => {
    expect(summarizeDoctorWorklist([
      "WAITING", "WAITING", "CALLED", "IN_SERVICE", "COMPLETED", "LEFT", "CANCELLED",
    ])).toEqual({ waiting: 2, called: 1, inService: 1, completed: 1, left: 1, cancelled: 1 });
  });

  it("returns zero rather than negative wait time for a future check-in timestamp", () => {
    expect(getDoctorQueueWaitingMinutes({
      checkedInAt: new Date("2026-11-09T10:20:00.000Z"),
      now: new Date("2026-11-09T10:15:00.000Z"),
      status: "WAITING",
    })).toBe(0);
  });

  it("calculates elapsed wait time for waiting and called tickets", () => {
    const input = {
      checkedInAt: new Date("2026-11-09T10:00:30.000Z"),
      now: new Date("2026-11-09T10:15:00.000Z"),
    };
    expect(getDoctorQueueWaitingMinutes({ ...input, status: "WAITING" })).toBe(14);
    expect(getDoctorQueueWaitingMinutes({ ...input, status: "CALLED" })).toBe(14);
  });

  it("stops counting wait time once a ticket enters service or reaches a terminal state", () => {
    const input = {
      checkedInAt: new Date("2026-11-09T10:00:00.000Z"),
      now: new Date("2026-11-09T10:30:00.000Z"),
    };
    expect(getDoctorQueueWaitingMinutes({ ...input, status: "IN_SERVICE" })).toBeNull();
    expect(getDoctorQueueWaitingMinutes({ ...input, status: "COMPLETED" })).toBeNull();
    expect(getDoctorQueueWaitingMinutes({ ...input, status: "LEFT" })).toBeNull();
    expect(getDoctorQueueWaitingMinutes({ ...input, status: "CANCELLED" })).toBeNull();
  });

  it("resolves appointment-origin Encounters through Appointment", () => {
    const appointmentEncounter = { id: "appointment_encounter" };
    const queueEncounter = { id: "queue_encounter" };
    expect(resolveDoctorWorklistEncounter({
      queueType: "APPOINTMENT",
      appointmentEncounter,
      queueEncounter,
    })).toBe(appointmentEncounter);
  });

  it("resolves walk-in Encounters through QueueEntry", () => {
    const appointmentEncounter = { id: "appointment_encounter" };
    const queueEncounter = { id: "queue_encounter" };
    expect(resolveDoctorWorklistEncounter({
      queueType: "WALK_IN",
      appointmentEncounter,
      queueEncounter,
    })).toBe(queueEncounter);
  });

  it("fails closed for invalid queue types when resolving the Encounter", () => {
    expect(resolveDoctorWorklistEncounter({
      queueType: "UNKNOWN",
      appointmentEncounter: { id: "appointment_encounter" },
      queueEncounter: { id: "queue_encounter" },
    })).toBeNull();
  });

  it("fails closed for invalid dates", () => {
    expect(getDoctorQueueWaitingMinutes({
      checkedInAt: new Date("invalid"),
      now: new Date("2026-11-09T10:15:00.000Z"),
      status: "WAITING",
    })).toBeNull();
  });
});
