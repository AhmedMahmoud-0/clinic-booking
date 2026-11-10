import { describe, expect, it } from "vitest";
import {
  decideDoctorDiagnosisAdd,
  decideDoctorDiagnosisCatalogUse,
  decideDoctorDiagnosisEncounterAccess,
  decideDoctorDiagnosisPrimaryChange,
} from "../../src/server/appointments/doctor-diagnosis-policy";

const validEncounterInput = {
  employeeStatus: "ACTIVE",
  activeRoles: ["DOCTOR"],
  doctorProfileId: "doctor_1",
  encounterExists: true,
  encounterDoctorId: "doctor_1",
  encounterStatus: "IN_PROGRESS",
  encounterCompletedAtExists: false,
  encounterOriginIsConsistent: true,
} as const;

describe("Doctor diagnosis encounter access policy", () => {
  it("allows an active assigned Doctor to access an active Encounter", () => {
    expect(decideDoctorDiagnosisEncounterAccess(validEncounterInput)).toEqual({
      kind: "ALLOW",
      doctorProfileId: "doctor_1",
    });
  });

  it("rejects an inactive employee", () => {
    expect(decideDoctorDiagnosisEncounterAccess({ ...validEncounterInput, employeeStatus: "INACTIVE" })).toEqual({
      kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
    });
  });

  it("rejects an employee without an active Doctor role", () => {
    expect(decideDoctorDiagnosisEncounterAccess({ ...validEncounterInput, activeRoles: ["NURSE"] })).toEqual({
      kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
    });
  });

  it("rejects an employee without a Doctor profile", () => {
    expect(decideDoctorDiagnosisEncounterAccess({ ...validEncounterInput, doctorProfileId: null })).toEqual({
      kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED",
    });
  });

  it("conceals a missing Encounter", () => {
    expect(decideDoctorDiagnosisEncounterAccess({ ...validEncounterInput, encounterExists: false })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_FOUND",
    });
  });

  it("conceals an Encounter assigned to another Doctor", () => {
    expect(decideDoctorDiagnosisEncounterAccess({ ...validEncounterInput, encounterDoctorId: "doctor_2" })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_FOUND",
    });
  });

  it("rejects an Encounter outside IN_PROGRESS", () => {
    expect(decideDoctorDiagnosisEncounterAccess({ ...validEncounterInput, encounterStatus: "COMPLETED" })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE",
    });
  });

  it("rejects an Encounter with a completion timestamp", () => {
    expect(decideDoctorDiagnosisEncounterAccess({ ...validEncounterInput, encounterCompletedAtExists: true })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE",
    });
  });

  it("rejects an inconsistent appointment or walk-in origin", () => {
    expect(decideDoctorDiagnosisEncounterAccess({ ...validEncounterInput, encounterOriginIsConsistent: false })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT",
    });
  });
});

describe("Doctor diagnosis catalogue policy", () => {
  it("rejects a missing catalogue diagnosis", () => {
    expect(decideDoctorDiagnosisCatalogUse({ diagnosisExists: false, diagnosisIsActive: false })).toEqual({
      kind: "REJECT", code: "DIAGNOSIS_NOT_AVAILABLE",
    });
  });

  it("rejects an inactive catalogue diagnosis", () => {
    expect(decideDoctorDiagnosisCatalogUse({ diagnosisExists: true, diagnosisIsActive: false })).toEqual({
      kind: "REJECT", code: "DIAGNOSIS_NOT_AVAILABLE",
    });
  });

  it("allows an active catalogue diagnosis", () => {
    expect(decideDoctorDiagnosisCatalogUse({ diagnosisExists: true, diagnosisIsActive: true })).toEqual({ kind: "ALLOW" });
  });
});

describe("Doctor diagnosis addition policy", () => {
  it("automatically makes the first diagnosis primary", () => {
    expect(decideDoctorDiagnosisAdd({ alreadyRecorded: false, currentPrimaryExists: false, requestedPrimary: false })).toEqual({
      kind: "CREATE", isPrimary: true, demoteCurrentPrimary: false,
    });
  });

  it("adds a later diagnosis as secondary by default", () => {
    expect(decideDoctorDiagnosisAdd({ alreadyRecorded: false, currentPrimaryExists: true, requestedPrimary: false })).toEqual({
      kind: "CREATE", isPrimary: false, demoteCurrentPrimary: false,
    });
  });

  it("promotes an explicitly selected diagnosis and demotes the existing primary", () => {
    expect(decideDoctorDiagnosisAdd({ alreadyRecorded: false, currentPrimaryExists: true, requestedPrimary: true })).toEqual({
      kind: "CREATE", isPrimary: true, demoteCurrentPrimary: true,
    });
  });

  it("keeps an explicitly primary first diagnosis primary", () => {
    expect(decideDoctorDiagnosisAdd({ alreadyRecorded: false, currentPrimaryExists: false, requestedPrimary: true })).toEqual({
      kind: "CREATE", isPrimary: true, demoteCurrentPrimary: false,
    });
  });

  it("rejects recording the same diagnosis twice", () => {
    expect(decideDoctorDiagnosisAdd({ alreadyRecorded: true, currentPrimaryExists: true, requestedPrimary: false })).toEqual({
      kind: "REJECT", code: "DIAGNOSIS_ALREADY_RECORDED",
    });
  });
});

describe("Doctor primary diagnosis change policy", () => {
  it("rejects a diagnosis that does not belong to the Encounter", () => {
    expect(decideDoctorDiagnosisPrimaryChange({ targetExists: false, targetIsPrimary: false })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_DIAGNOSIS_NOT_FOUND",
    });
  });

  it("does not create an update for the already-primary diagnosis", () => {
    expect(decideDoctorDiagnosisPrimaryChange({ targetExists: true, targetIsPrimary: true })).toEqual({ kind: "UNCHANGED" });
  });

  it("promotes an existing secondary diagnosis", () => {
    expect(decideDoctorDiagnosisPrimaryChange({ targetExists: true, targetIsPrimary: false })).toEqual({ kind: "PROMOTE" });
  });
});
