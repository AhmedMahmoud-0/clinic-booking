export interface DoctorClinicalNoteSignInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string | null;
  encounterCompletedAtExists: boolean;
  encounterOriginIsConsistent: boolean;
  noteCount: number;
  noteStatus: string | null;
  noteSignedAtExists: boolean;
  noteAuthorEmployeeId: string | null;
  actorEmployeeId: string;
  chiefComplaint: string | null;
  hasClinicalContent: boolean;
}

export type DoctorClinicalNoteSignRejection =
  | "DOCTOR_WORKSPACE_ACCESS_REQUIRED"
  | "DOCTOR_PROFILE_REQUIRED"
  | "ENCOUNTER_NOT_FOUND"
  | "ENCOUNTER_NOT_EDITABLE"
  | "ENCOUNTER_SOURCE_INCONSISTENT"
  | "INITIAL_NOTE_MISSING"
  | "INITIAL_NOTE_AMBIGUOUS"
  | "INITIAL_NOTE_ALREADY_SIGNED"
  | "INITIAL_NOTE_STATE_INCONSISTENT"
  | "INITIAL_NOTE_AUTHOR_MISMATCH"
  | "INITIAL_NOTE_CONTENT_INCOMPLETE";

export type DoctorClinicalNoteSignDecision =
  | { kind: "SIGN" }
  | { kind: "REJECT"; code: DoctorClinicalNoteSignRejection };

/**
 * Sign only the original Doctor's single, unsigned initial assessment on their
 * active Encounter. A non-empty complaint and at least one SOAP section are
 * required; the workflow does not infer whether a clinical section was assessed.
 */
export function decideDoctorClinicalNoteSign(
  input: DoctorClinicalNoteSignInput,
): DoctorClinicalNoteSignDecision {
  if (input.employeeStatus !== "ACTIVE" || !input.activeRoles.includes("DOCTOR")) {
    return { kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" };
  }
  if (!input.doctorProfileId) return { kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" };
  if (!input.encounterExists || input.encounterDoctorId !== input.doctorProfileId) {
    return { kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" };
  }
  if (input.encounterStatus !== "IN_PROGRESS" || input.encounterCompletedAtExists) {
    return { kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" };
  }
  if (!input.encounterOriginIsConsistent) {
    return { kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT" };
  }
  if (!Number.isInteger(input.noteCount) || input.noteCount < 0) {
    return { kind: "REJECT", code: "INITIAL_NOTE_STATE_INCONSISTENT" };
  }
  if (input.noteCount === 0) return { kind: "REJECT", code: "INITIAL_NOTE_MISSING" };
  if (input.noteCount !== 1) return { kind: "REJECT", code: "INITIAL_NOTE_AMBIGUOUS" };
  if (input.noteStatus === "SIGNED" && input.noteSignedAtExists) {
    return { kind: "REJECT", code: "INITIAL_NOTE_ALREADY_SIGNED" };
  }
  if (input.noteStatus !== "DRAFT" || input.noteSignedAtExists) {
    return { kind: "REJECT", code: "INITIAL_NOTE_STATE_INCONSISTENT" };
  }
  if (input.noteAuthorEmployeeId !== input.actorEmployeeId) {
    return { kind: "REJECT", code: "INITIAL_NOTE_AUTHOR_MISMATCH" };
  }
  if (!input.chiefComplaint?.trim() || !input.hasClinicalContent) {
    return { kind: "REJECT", code: "INITIAL_NOTE_CONTENT_INCOMPLETE" };
  }
  return { kind: "SIGN" };
}
