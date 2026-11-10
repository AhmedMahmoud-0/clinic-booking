import { describe, expect, it } from "vitest";
import {
  decideDoctorPrescriptionDraftCreation,
  decideDoctorPrescriptionDraftMutation,
  decideDoctorPrescriptionEncounterAccess,
} from "../../src/server/appointments/doctor-prescription-policy";

const allowedEncounter = {
  employeeStatus: "ACTIVE",
  activeRoles: ["DOCTOR"],
  doctorProfileId: "doctor_profile_1",
  encounterExists: true,
  encounterDoctorId: "doctor_profile_1",
  encounterStatus: "IN_PROGRESS",
  encounterCompletedAtExists: false,
  encounterOriginIsConsistent: true,
};

describe("Doctor prescription Encounter access policy", () => {
  it("allows an active assigned Doctor to work on an in-progress Encounter", () => {
    expect(decideDoctorPrescriptionEncounterAccess(allowedEncounter)).toEqual({
      kind: "ALLOW", doctorProfileId: "doctor_profile_1",
    });
  });
  it("rejects an inactive employee", () => {
    expect(decideDoctorPrescriptionEncounterAccess({ ...allowedEncounter, employeeStatus: "INACTIVE" })).toEqual({
      kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
    });
  });
  it("rejects an employee without an active Doctor role", () => {
    expect(decideDoctorPrescriptionEncounterAccess({ ...allowedEncounter, activeRoles: ["RECEPTION"] })).toEqual({
      kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
    });
  });
  it("rejects an employee without a linked Doctor profile", () => {
    expect(decideDoctorPrescriptionEncounterAccess({ ...allowedEncounter, doctorProfileId: null })).toEqual({
      kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED",
    });
  });
  it("conceals an Encounter assigned to another Doctor", () => {
    expect(decideDoctorPrescriptionEncounterAccess({ ...allowedEncounter, encounterDoctorId: "another_doctor" })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_FOUND",
    });
  });
  it("rejects a missing Encounter", () => {
    expect(decideDoctorPrescriptionEncounterAccess({ ...allowedEncounter, encounterExists: false })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_FOUND",
    });
  });
  it("rejects a completed Encounter", () => {
    expect(decideDoctorPrescriptionEncounterAccess({ ...allowedEncounter, encounterStatus: "COMPLETED" })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE",
    });
  });
  it("rejects an Encounter that has a completion timestamp", () => {
    expect(decideDoctorPrescriptionEncounterAccess({ ...allowedEncounter, encounterCompletedAtExists: true })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE",
    });
  });
  it("rejects an Encounter with an inconsistent appointment or walk-in origin", () => {
    expect(decideDoctorPrescriptionEncounterAccess({ ...allowedEncounter, encounterOriginIsConsistent: false })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT",
    });
  });
});

describe("Doctor prescription draft creation policy", () => {
  it("allows creating the first draft", () => {
    expect(decideDoctorPrescriptionDraftCreation({ existingDraftCount: 0 })).toEqual({ kind: "CREATE" });
  });
  it("rejects creating a second draft", () => {
    expect(decideDoctorPrescriptionDraftCreation({ existingDraftCount: 1 })).toEqual({
      kind: "REJECT", code: "PRESCRIPTION_DRAFT_ALREADY_EXISTS",
    });
  });
  it("fails closed when multiple draft rows already exist", () => {
    expect(decideDoctorPrescriptionDraftCreation({ existingDraftCount: 2 })).toEqual({
      kind: "REJECT", code: "PRESCRIPTION_DRAFT_ALREADY_EXISTS",
    });
  });
});

describe("Doctor prescription draft mutation policy", () => {
  const ownedDraft = {
    prescriptionExists: true,
    prescriptionStatus: "DRAFT",
    prescribedByEmployeeId: "employee_1",
    actorEmployeeId: "employee_1",
    issuedAtExists: false,
  };
  it("allows the original author to update an unsigned draft", () => {
    expect(decideDoctorPrescriptionDraftMutation(ownedDraft)).toEqual({ kind: "UPDATE" });
  });
  it("rejects a missing prescription", () => {
    expect(decideDoctorPrescriptionDraftMutation({ ...ownedDraft, prescriptionExists: false })).toEqual({
      kind: "REJECT", code: "PRESCRIPTION_NOT_FOUND",
    });
  });
  it("rejects an issued prescription", () => {
    expect(decideDoctorPrescriptionDraftMutation({ ...ownedDraft, prescriptionStatus: "ISSUED" })).toEqual({
      kind: "REJECT", code: "PRESCRIPTION_NOT_EDITABLE",
    });
  });
  it("rejects a cancelled prescription", () => {
    expect(decideDoctorPrescriptionDraftMutation({ ...ownedDraft, prescriptionStatus: "CANCELLED" })).toEqual({
      kind: "REJECT", code: "PRESCRIPTION_NOT_EDITABLE",
    });
  });
  it("rejects a draft authored by another employee", () => {
    expect(decideDoctorPrescriptionDraftMutation({ ...ownedDraft, prescribedByEmployeeId: "employee_2" })).toEqual({
      kind: "REJECT", code: "PRESCRIPTION_AUTHOR_MISMATCH",
    });
  });
  it("rejects a draft whose status is inconsistent with a non-null issue timestamp", () => {
    expect(decideDoctorPrescriptionDraftMutation({ ...ownedDraft, issuedAtExists: true })).toEqual({
      kind: "REJECT", code: "PRESCRIPTION_STATE_INCONSISTENT",
    });
  });
  it("rejects unknown prescription statuses", () => {
    expect(decideDoctorPrescriptionDraftMutation({ ...ownedDraft, prescriptionStatus: "UNKNOWN" })).toEqual({
      kind: "REJECT", code: "PRESCRIPTION_NOT_EDITABLE",
    });
  });
});
