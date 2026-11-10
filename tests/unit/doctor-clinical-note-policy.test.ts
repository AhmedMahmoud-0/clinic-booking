import { describe, expect, it } from "vitest";
import {
  decideDoctorClinicalNoteDraftSave,
  type DoctorClinicalNotePolicyInput,
} from "../../src/server/appointments/doctor-clinical-note-policy";

const validInput: DoctorClinicalNotePolicyInput = {
  employeeId: "employee_doctor_1",
  employeeStatus: "ACTIVE",
  activeRoles: ["DOCTOR"],
  doctorProfileId: "doctor_1",
  encounterExists: true,
  encounterDoctorId: "doctor_1",
  encounterStatus: "IN_PROGRESS",
  encounterCompletedAtExists: false,
  encounterOriginIsConsistent: true,
  initialAssessmentNotes: [],
};

const draftNote = {
  id: "clinical_note_1",
  status: "DRAFT",
  authorEmployeeId: "employee_doctor_1",
  signedAtExists: false,
};

describe("Doctor clinical-note draft policy", () => {
  it("creates the initial assessment when no initial note exists", () => {
    expect(decideDoctorClinicalNoteDraftSave(validInput)).toEqual({ kind: "CREATE" });
  });

  it("updates an unsigned draft authored by the authenticated Doctor", () => {
    expect(decideDoctorClinicalNoteDraftSave({
      ...validInput,
      initialAssessmentNotes: [draftNote],
    })).toEqual({ kind: "UPDATE", clinicalNoteId: "clinical_note_1" });
  });

  it("rejects an inactive employee", () => {
    expect(decideDoctorClinicalNoteDraftSave({ ...validInput, employeeStatus: "INACTIVE" })).toEqual({
      kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
    });
  });

  it("rejects an employee without an active Doctor role", () => {
    expect(decideDoctorClinicalNoteDraftSave({ ...validInput, activeRoles: ["RECEPTION"] })).toEqual({
      kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
    });
  });

  it("rejects a Doctor whose profile is no longer linked", () => {
    expect(decideDoctorClinicalNoteDraftSave({ ...validInput, doctorProfileId: null })).toEqual({
      kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED",
    });
  });

  it("rejects an unknown Encounter", () => {
    expect(decideDoctorClinicalNoteDraftSave({ ...validInput, encounterExists: false })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_FOUND",
    });
  });

  it("does not disclose an Encounter assigned to another Doctor", () => {
    expect(decideDoctorClinicalNoteDraftSave({ ...validInput, encounterDoctorId: "doctor_2" })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_FOUND",
    });
  });

  it("rejects a completed Encounter", () => {
    expect(decideDoctorClinicalNoteDraftSave({ ...validInput, encounterStatus: "COMPLETED" })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE",
    });
  });

  it("rejects a cancelled Encounter", () => {
    expect(decideDoctorClinicalNoteDraftSave({ ...validInput, encounterStatus: "CANCELLED" })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE",
    });
  });

  it("rejects an in-progress Encounter carrying a completed timestamp", () => {
    expect(decideDoctorClinicalNoteDraftSave({ ...validInput, encounterCompletedAtExists: true })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE",
    });
  });

  it("rejects inconsistent appointment or walk-in origin linkage", () => {
    expect(decideDoctorClinicalNoteDraftSave({ ...validInput, encounterOriginIsConsistent: false })).toEqual({
      kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT",
    });
  });

  it("fails closed when multiple initial assessment notes exist", () => {
    expect(decideDoctorClinicalNoteDraftSave({
      ...validInput,
      initialAssessmentNotes: [draftNote, { ...draftNote, id: "clinical_note_2" }],
    })).toEqual({ kind: "REJECT", code: "INITIAL_NOTE_AMBIGUOUS" });
  });

  it("never updates a signed initial assessment", () => {
    expect(decideDoctorClinicalNoteDraftSave({
      ...validInput,
      initialAssessmentNotes: [{ ...draftNote, status: "SIGNED", signedAtExists: true }],
    })).toEqual({ kind: "REJECT", code: "INITIAL_NOTE_SIGNED_IMMUTABLE" });
  });

  it("rejects an invalid signature state on a draft note", () => {
    expect(decideDoctorClinicalNoteDraftSave({
      ...validInput,
      initialAssessmentNotes: [{ ...draftNote, signedAtExists: true }],
    })).toEqual({ kind: "REJECT", code: "INITIAL_NOTE_STATE_INCONSISTENT" });
  });

  it("rejects a draft authored by another employee", () => {
    expect(decideDoctorClinicalNoteDraftSave({
      ...validInput,
      initialAssessmentNotes: [{ ...draftNote, authorEmployeeId: "employee_doctor_2" }],
    })).toEqual({ kind: "REJECT", code: "INITIAL_NOTE_AUTHOR_MISMATCH" });
  });

  it("rejects an unknown note status instead of treating it as editable", () => {
    expect(decideDoctorClinicalNoteDraftSave({
      ...validInput,
      initialAssessmentNotes: [{ ...draftNote, status: "ARCHIVED" }],
    })).toEqual({ kind: "REJECT", code: "INITIAL_NOTE_STATE_INCONSISTENT" });
  });
});
