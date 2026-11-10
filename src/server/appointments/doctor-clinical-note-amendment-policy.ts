export interface DoctorClinicalNoteAmendmentPolicyInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string | null;
  encounterLifecycleIsConsistent: boolean;
  noteCount: number;
  noteType: string | null;
  noteStatus: string | null;
  noteSignedAtExists: boolean;
  noteAuthorEmployeeId: string | null;
  actorEmployeeId: string;
}

export type DoctorClinicalNoteAmendmentRejection =
  | "DOCTOR_WORKSPACE_ACCESS_REQUIRED"
  | "DOCTOR_PROFILE_REQUIRED"
  | "ENCOUNTER_NOT_FOUND"
  | "ENCOUNTER_NOT_AMENDABLE"
  | "ENCOUNTER_SOURCE_INCONSISTENT"
  | "INITIAL_NOTE_MISSING"
  | "INITIAL_NOTE_AMBIGUOUS"
  | "INITIAL_NOTE_NOT_SIGNED"
  | "INITIAL_NOTE_STATE_INCONSISTENT"
  | "INITIAL_NOTE_AUTHOR_MISMATCH";

export type DoctorClinicalNoteAmendmentDecision =
  | { kind: "AMEND" }
  | { kind: "REJECT"; code: DoctorClinicalNoteAmendmentRejection };

/**
 * Only the active Doctor who authored the signed initial assessment may append
 * a correction to their own Encounter. The signed note itself is never changed.
 */
export function decideDoctorClinicalNoteAmendment(
  input: DoctorClinicalNoteAmendmentPolicyInput,
): DoctorClinicalNoteAmendmentDecision {
  if (input.employeeStatus !== "ACTIVE" || !input.activeRoles.includes("DOCTOR")) {
    return { kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" };
  }
  if (!input.doctorProfileId) {
    return { kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" };
  }
  if (!input.encounterExists || input.encounterDoctorId !== input.doctorProfileId) {
    return { kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" };
  }
  if (input.encounterStatus !== "IN_PROGRESS" && input.encounterStatus !== "COMPLETED") {
    return { kind: "REJECT", code: "ENCOUNTER_NOT_AMENDABLE" };
  }
  if (!input.encounterLifecycleIsConsistent) {
    return { kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT" };
  }
  if (!Number.isInteger(input.noteCount) || input.noteCount < 0) {
    return { kind: "REJECT", code: "INITIAL_NOTE_STATE_INCONSISTENT" };
  }
  if (input.noteCount === 0) {
    return { kind: "REJECT", code: "INITIAL_NOTE_MISSING" };
  }
  if (input.noteCount !== 1) {
    return { kind: "REJECT", code: "INITIAL_NOTE_AMBIGUOUS" };
  }
  if (input.noteType !== "INITIAL_ASSESSMENT") {
    return { kind: "REJECT", code: "INITIAL_NOTE_STATE_INCONSISTENT" };
  }
  if (input.noteStatus === "SIGNED" && !input.noteSignedAtExists) {
    return { kind: "REJECT", code: "INITIAL_NOTE_STATE_INCONSISTENT" };
  }
  if (input.noteStatus !== "SIGNED") {
    return {
      kind: "REJECT",
      code: input.noteStatus === "DRAFT" ? "INITIAL_NOTE_NOT_SIGNED" : "INITIAL_NOTE_STATE_INCONSISTENT",
    };
  }
  if (input.noteAuthorEmployeeId !== input.actorEmployeeId) {
    return { kind: "REJECT", code: "INITIAL_NOTE_AUTHOR_MISMATCH" };
  }
  return { kind: "AMEND" };
}
