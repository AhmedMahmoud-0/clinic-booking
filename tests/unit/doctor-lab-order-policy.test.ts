import { describe, expect, it } from "vitest";
import {
  decideDoctorLabEncounterAccess,
  decideDoctorLabTestSelection,
} from "../../src/server/appointments/doctor-lab-order-policy";

const validEncounter = {
  employeeStatus: "ACTIVE",
  activeRoles: ["DOCTOR"],
  doctorProfileId: "doctor_1",
  encounterExists: true,
  encounterDoctorId: "doctor_1",
  encounterStatus: "IN_PROGRESS",
  encounterCompletedAtExists: false,
  encounterOriginIsConsistent: true,
};

describe("Doctor laboratory Encounter access policy", () => {
  it("allows an active Doctor assigned to an in-progress Encounter", () => {
    expect(decideDoctorLabEncounterAccess(validEncounter)).toEqual({ kind: "ALLOW", doctorProfileId: "doctor_1" });
  });
  it("rejects inactive employees", () => {
    expect(decideDoctorLabEncounterAccess({ ...validEncounter, employeeStatus: "INACTIVE" })).toEqual({ kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" });
  });
  it("rejects employees without an active Doctor role", () => {
    expect(decideDoctorLabEncounterAccess({ ...validEncounter, activeRoles: ["RECEPTION"] })).toEqual({ kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" });
  });
  it("rejects a missing Doctor profile", () => {
    expect(decideDoctorLabEncounterAccess({ ...validEncounter, doctorProfileId: null })).toEqual({ kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" });
  });
  it("rejects a missing Encounter", () => {
    expect(decideDoctorLabEncounterAccess({ ...validEncounter, encounterExists: false })).toEqual({ kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" });
  });
  it("conceals an Encounter assigned to another Doctor", () => {
    expect(decideDoctorLabEncounterAccess({ ...validEncounter, encounterDoctorId: "doctor_2" })).toEqual({ kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" });
  });
  it("rejects an Encounter that is not in progress", () => {
    expect(decideDoctorLabEncounterAccess({ ...validEncounter, encounterStatus: "COMPLETED" })).toEqual({ kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" });
  });
  it("rejects an Encounter with a completion timestamp", () => {
    expect(decideDoctorLabEncounterAccess({ ...validEncounter, encounterCompletedAtExists: true })).toEqual({ kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" });
  });
  it("rejects an inconsistent visit origin", () => {
    expect(decideDoctorLabEncounterAccess({ ...validEncounter, encounterOriginIsConsistent: false })).toEqual({ kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT" });
  });
  it("allows an active appointment-origin Encounter after source checks", () => {
    expect(decideDoctorLabEncounterAccess({ ...validEncounter, encounterOriginIsConsistent: true }).kind).toBe("ALLOW");
  });
  it("allows an employee with a Doctor role among multiple active roles", () => {
    expect(decideDoctorLabEncounterAccess({ ...validEncounter, activeRoles: ["NURSE", "DOCTOR"] }).kind).toBe("ALLOW");
  });
});

describe("Doctor laboratory test selection policy", () => {
  it("allows one active selected test", () => {
    expect(decideDoctorLabTestSelection({ requestedTestIds: ["test_1"], availableTestIds: ["test_1"] })).toEqual({ kind: "ALLOW" });
  });
  it("allows up to twenty distinct active tests", () => {
    const ids = Array.from({ length: 20 }, (_, index) => `test_${index}`);
    expect(decideDoctorLabTestSelection({ requestedTestIds: ids, availableTestIds: ids })).toEqual({ kind: "ALLOW" });
  });
  it("rejects an empty selection", () => {
    expect(decideDoctorLabTestSelection({ requestedTestIds: [], availableTestIds: [] })).toEqual({ kind: "REJECT", code: "LAB_TEST_SELECTION_INVALID" });
  });
  it("rejects more than twenty tests", () => {
    const ids = Array.from({ length: 21 }, (_, index) => `test_${index}`);
    expect(decideDoctorLabTestSelection({ requestedTestIds: ids, availableTestIds: ids })).toEqual({ kind: "REJECT", code: "LAB_TEST_SELECTION_INVALID" });
  });
  it("rejects duplicate test IDs", () => {
    expect(decideDoctorLabTestSelection({ requestedTestIds: ["test_1", "test_1"], availableTestIds: ["test_1"] })).toEqual({ kind: "REJECT", code: "LAB_TEST_SELECTION_INVALID" });
  });
  it("rejects a test absent from the active catalog result", () => {
    expect(decideDoctorLabTestSelection({ requestedTestIds: ["test_1", "test_2"], availableTestIds: ["test_1"] })).toEqual({ kind: "REJECT", code: "LAB_TEST_NOT_AVAILABLE" });
  });
});
