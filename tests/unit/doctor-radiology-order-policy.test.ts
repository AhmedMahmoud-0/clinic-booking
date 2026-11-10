import { describe, expect, it } from "vitest";
import {
  decideDoctorRadiologyEncounterAccess,
  decideDoctorRadiologyPregnancyAssessment,
  decideDoctorRadiologyProcedureSelection,
} from "../../src/server/appointments/doctor-radiology-order-policy";

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

describe("Doctor radiology Encounter access policy", () => {
  it("allows an active Doctor assigned to an in-progress Encounter", () => {
    expect(decideDoctorRadiologyEncounterAccess(validEncounter)).toEqual({ kind: "ALLOW", doctorProfileId: "doctor_1" });
  });
  it("rejects inactive employees", () => {
    expect(decideDoctorRadiologyEncounterAccess({ ...validEncounter, employeeStatus: "INACTIVE" })).toEqual({ kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" });
  });
  it("rejects employees without an active Doctor role", () => {
    expect(decideDoctorRadiologyEncounterAccess({ ...validEncounter, activeRoles: ["RECEPTION"] })).toEqual({ kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" });
  });
  it("rejects a missing Doctor profile", () => {
    expect(decideDoctorRadiologyEncounterAccess({ ...validEncounter, doctorProfileId: null })).toEqual({ kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" });
  });
  it("rejects a missing Encounter", () => {
    expect(decideDoctorRadiologyEncounterAccess({ ...validEncounter, encounterExists: false })).toEqual({ kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" });
  });
  it("conceals an Encounter assigned to another Doctor", () => {
    expect(decideDoctorRadiologyEncounterAccess({ ...validEncounter, encounterDoctorId: "doctor_2" })).toEqual({ kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" });
  });
  it("rejects an Encounter that is not in progress", () => {
    expect(decideDoctorRadiologyEncounterAccess({ ...validEncounter, encounterStatus: "COMPLETED" })).toEqual({ kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" });
  });
  it("rejects an Encounter with a completion timestamp", () => {
    expect(decideDoctorRadiologyEncounterAccess({ ...validEncounter, encounterCompletedAtExists: true })).toEqual({ kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" });
  });
  it("rejects an inconsistent appointment or walk-in origin", () => {
    expect(decideDoctorRadiologyEncounterAccess({ ...validEncounter, encounterOriginIsConsistent: false })).toEqual({ kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT" });
  });
});

const xray = { id: "proc_xray", modality: "DIGITAL_XRAY" };
const ultrasound = { id: "proc_us", modality: "ULTRASOUND" };

describe("Doctor radiology procedure selection policy", () => {
  it("allows one active procedure", () => {
    expect(decideDoctorRadiologyProcedureSelection({ requestedProcedureIds: [xray.id], availableProcedures: [xray] })).toEqual({ kind: "ALLOW", hasDigitalXray: true });
  });
  it("allows up to ten distinct active procedures", () => {
    const ids = Array.from({ length: 10 }, (_, index) => `proc_${index}`);
    const available = ids.map((id) => ({ id, modality: "ULTRASOUND" }));
    expect(decideDoctorRadiologyProcedureSelection({ requestedProcedureIds: ids, availableProcedures: available })).toEqual({ kind: "ALLOW", hasDigitalXray: false });
  });
  it("rejects an empty selection", () => {
    expect(decideDoctorRadiologyProcedureSelection({ requestedProcedureIds: [], availableProcedures: [] })).toEqual({ kind: "REJECT", code: "RADIOLOGY_PROCEDURE_SELECTION_INVALID" });
  });
  it("rejects more than ten procedures", () => {
    const ids = Array.from({ length: 11 }, (_, index) => `proc_${index}`);
    const available = ids.map((id) => ({ id, modality: "ULTRASOUND" }));
    expect(decideDoctorRadiologyProcedureSelection({ requestedProcedureIds: ids, availableProcedures: available })).toEqual({ kind: "REJECT", code: "RADIOLOGY_PROCEDURE_SELECTION_INVALID" });
  });
  it("rejects duplicate procedure IDs", () => {
    expect(decideDoctorRadiologyProcedureSelection({ requestedProcedureIds: [xray.id, xray.id], availableProcedures: [xray] })).toEqual({ kind: "REJECT", code: "RADIOLOGY_PROCEDURE_SELECTION_INVALID" });
  });
  it("rejects inactive or unknown procedure IDs absent from the active result", () => {
    expect(decideDoctorRadiologyProcedureSelection({ requestedProcedureIds: [xray.id, "inactive"], availableProcedures: [xray] })).toEqual({ kind: "REJECT", code: "RADIOLOGY_PROCEDURE_NOT_AVAILABLE" });
  });
  it("detects a digital X-ray in a mixed order", () => {
    expect(decideDoctorRadiologyProcedureSelection({ requestedProcedureIds: [ultrasound.id, xray.id], availableProcedures: [ultrasound, xray] })).toEqual({ kind: "ALLOW", hasDigitalXray: true });
  });
  it("does not require an X-ray screening decision when all selected procedures are ultrasound", () => {
    expect(decideDoctorRadiologyProcedureSelection({ requestedProcedureIds: [ultrasound.id], availableProcedures: [ultrasound] })).toEqual({ kind: "ALLOW", hasDigitalXray: false });
  });
});

describe("Doctor order-time X-ray screening decision policy", () => {
  it("requires a screening decision for every order containing a digital X-ray", () => {
    expect(decideDoctorRadiologyPregnancyAssessment({ hasDigitalXray: true, assessment: null, notes: null })).toEqual({ kind: "REJECT", code: "RADIOLOGY_XRAY_ASSESSMENT_REQUIRED" });
  });
  it("allows a decision that formal screening is required", () => {
    expect(decideDoctorRadiologyPregnancyAssessment({ hasDigitalXray: true, assessment: "SCREENING_REQUIRED", notes: null })).toEqual({ kind: "ALLOW" });
  });
  it("allows a documented decision that screening is not indicated", () => {
    expect(decideDoctorRadiologyPregnancyAssessment({ hasDigitalXray: true, assessment: "NOT_INDICATED", notes: "Clinical rationale: screening not indicated." })).toEqual({ kind: "ALLOW" });
  });
  it("requires a rationale when formal screening is not indicated", () => {
    expect(decideDoctorRadiologyPregnancyAssessment({ hasDigitalXray: true, assessment: "NOT_INDICATED", notes: "   " })).toEqual({ kind: "REJECT", code: "RADIOLOGY_ASSESSMENT_REASON_REQUIRED" });
  });
  it("rejects an X-ray screening decision when the order contains no X-ray", () => {
    expect(decideDoctorRadiologyPregnancyAssessment({ hasDigitalXray: false, assessment: "SCREENING_REQUIRED", notes: null })).toEqual({ kind: "REJECT", code: "RADIOLOGY_ASSESSMENT_WITHOUT_XRAY" });
  });
  it("allows ultrasound-only orders without assessment fields", () => {
    expect(decideDoctorRadiologyPregnancyAssessment({ hasDigitalXray: false, assessment: null, notes: null })).toEqual({ kind: "ALLOW" });
  });
});
