import { describe, expect, it } from "vitest";
import { decideDoctorEncounterStart, type DoctorEncounterStartPolicyInput } from "../../src/server/appointments/doctor-encounter-start-policy";

const validAppointmentInput: DoctorEncounterStartPolicyInput = {
  employeeStatus: "ACTIVE",
  activeRoles: ["DOCTOR"],
  doctorProfileLinked: true,
  queueEntryExists: true,
  queueDateIsToday: true,
  queueStatus: "CALLED",
  queueType: "APPOINTMENT",
  queueAppointmentId: "appointment_1",
  queueCalledAtExists: true,
  patientIsActive: true,
  appointmentExists: true,
  appointmentId: "appointment_1",
  appointmentPatientMatches: true,
  appointmentDoctorMatches: true,
  appointmentStatus: "CHECKED_IN",
  appointmentStateIsReady: true,
  serviceStartedAtExists: false,
  encounterOriginIsConsistent: true,
  existingEncounterId: null,
  existingEncounterStatus: null,
  doctorHasOtherInServiceEntry: false,
};

const validWalkInInput: DoctorEncounterStartPolicyInput = {
  ...validAppointmentInput,
  queueType: "WALK_IN",
  queueAppointmentId: null,
  appointmentExists: false,
  appointmentId: null,
  appointmentPatientMatches: false,
  appointmentDoctorMatches: false,
  appointmentStatus: null,
};

describe("Doctor encounter start policy", () => {
  it("starts a called checked-in appointment with consistent patient and doctor links", () => {
    expect(decideDoctorEncounterStart(validAppointmentInput)).toEqual({ kind: "START" });
  });

  it("starts a called walk-in without inventing an appointment", () => {
    expect(decideDoctorEncounterStart(validWalkInInput)).toEqual({ kind: "START" });
  });

  it("rejects an inactive employee", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, employeeStatus: "INACTIVE" })).toEqual({
      kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
    });
  });

  it("rejects an employee without an active Doctor role", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, activeRoles: ["RECEPTION"] })).toEqual({
      kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
    });
  });

  it("rejects a Doctor without a linked DoctorProfile", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, doctorProfileLinked: false })).toEqual({
      kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED",
    });
  });

  it("rejects a queue ticket outside the current Cairo-local day", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, queueDateIsToday: false })).toEqual({
      kind: "REJECT", code: "QUEUE_ENTRY_NOT_TODAY",
    });
  });

  it("rejects an inactive patient", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, patientIsActive: false })).toEqual({
      kind: "REJECT", code: "PATIENT_NOT_ACTIVE",
    });
  });

  it("rejects an appointment ticket with a missing or inconsistent appointment link", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, appointmentExists: false })).toEqual({
      kind: "REJECT", code: "QUEUE_ENTRY_SOURCE_INCONSISTENT",
    });
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, appointmentPatientMatches: false })).toEqual({
      kind: "REJECT", code: "QUEUE_ENTRY_SOURCE_INCONSISTENT",
    });
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, appointmentDoctorMatches: false })).toEqual({
      kind: "REJECT", code: "QUEUE_ENTRY_SOURCE_INCONSISTENT",
    });
  });

  it("rejects a walk-in carrying an appointment link", () => {
    expect(decideDoctorEncounterStart({
      ...validWalkInInput,
      queueAppointmentId: "appointment_1",
      appointmentExists: true,
      appointmentId: "appointment_1",
    })).toEqual({ kind: "REJECT", code: "QUEUE_ENTRY_SOURCE_INCONSISTENT" });
  });

  it("rejects an appointment that has not been checked in", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, appointmentStatus: "CONFIRMED" })).toEqual({
      kind: "REJECT", code: "APPOINTMENT_NOT_READY_FOR_CONSULTATION",
    });
  });

  it("rejects any queue ticket that is not currently CALLED", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, queueStatus: "WAITING" })).toEqual({
      kind: "REJECT", code: "QUEUE_ENTRY_NOT_CALLED",
    });
  });

  it("does not create a duplicate when the same encounter is already in service", () => {
    expect(decideDoctorEncounterStart({
      ...validAppointmentInput,
      queueStatus: "IN_SERVICE",
      appointmentStatus: "IN_CONSULTATION",
      serviceStartedAtExists: true,
      existingEncounterId: "encounter_1",
      existingEncounterStatus: "IN_PROGRESS",
    })).toEqual({ kind: "ALREADY_STARTED" });
  });

  it("rejects a linked encounter when the queue is not in the matching active state", () => {
    expect(decideDoctorEncounterStart({
      ...validAppointmentInput,
      existingEncounterId: "encounter_1",
      existingEncounterStatus: "IN_PROGRESS",
    })).toEqual({ kind: "REJECT", code: "ENCOUNTER_ALREADY_EXISTS" });
  });

  it("prevents a Doctor from starting a second ticket while another ticket is in service", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, doctorHasOtherInServiceEntry: true })).toEqual({
      kind: "REJECT", code: "DOCTOR_ALREADY_HAS_ACTIVE_CONSULTATION",
    });
  });

  it("rejects a CALLED ticket missing its called timestamp", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, queueCalledAtExists: false })).toEqual({
      kind: "REJECT", code: "QUEUE_ENTRY_NOT_CALLED",
    });
  });

  it("rejects an appointment with invalid check-in timestamp or terminal timestamps", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, appointmentStateIsReady: false })).toEqual({
      kind: "REJECT", code: "APPOINTMENT_NOT_READY_FOR_CONSULTATION",
    });
  });

  it("rejects an encounter linked to the wrong visit origin", () => {
    expect(decideDoctorEncounterStart({ ...validAppointmentInput, encounterOriginIsConsistent: false })).toEqual({
      kind: "REJECT", code: "QUEUE_ENTRY_SOURCE_INCONSISTENT",
    });
  });
});
