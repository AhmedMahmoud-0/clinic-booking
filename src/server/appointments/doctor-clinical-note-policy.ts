export interface DoctorClinicalNotePolicyInput {
  employeeId: string;
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string | null;
  encounterCompletedAtExists: boolean;
  encounterOriginIsConsistent: boolean;
  initialAssessmentNotes: readonly {
    id: string;
    status: string;
    authorEmployeeId: string;
    signedAtExists: boolean;
  }[];
}

export type DoctorClinicalNotePolicyDecision =
  | { kind: "CREATE" }
  | { kind: "UPDATE"; clinicalNoteId: string }
  | {
      kind: "REJECT";
      code:
        | "DOCTOR_WORKSPACE_ACCESS_REQUIRED"
        | "DOCTOR_PROFILE_REQUIRED"
        | "ENCOUNTER_NOT_FOUND"
        | "ENCOUNTER_NOT_EDITABLE"
        | "ENCOUNTER_SOURCE_INCONSISTENT"
        | "INITIAL_NOTE_AMBIGUOUS"
        | "INITIAL_NOTE_SIGNED_IMMUTABLE"
        | "INITIAL_NOTE_STATE_INCONSISTENT"
        | "INITIAL_NOTE_AUTHOR_MISMATCH";
    };

/**
 * Pure policy for saving the first structured assessment draft of an active
 * Doctor-owned Encounter. Persistence locks and transaction boundaries remain
 * the responsibility of the service layer.
 */
export function decideDoctorClinicalNoteDraftSave(
  input: DoctorClinicalNotePolicyInput,
): DoctorClinicalNotePolicyDecision {
  if (input.employeeStatus !== "ACTIVE" || !input.activeRoles.includes("DOCTOR")) {
    return { kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" };
  }
  if (!input.doctorProfileId) {
    return { kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" };
  }
  if (!input.encounterExists) {
    return { kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" };
  }
  // Conceal encounters assigned to another Doctor.
  if (input.encounterDoctorId !== input.doctorProfileId) {
    return { kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" };
  }
  if (input.encounterStatus !== "IN_PROGRESS" || input.encounterCompletedAtExists) {
    return { kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" };
  }
  if (!input.encounterOriginIsConsistent) {
    return { kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT" };
  }

  if (input.initialAssessmentNotes.length > 1) {
    return { kind: "REJECT", code: "INITIAL_NOTE_AMBIGUOUS" };
  }
  const existing = input.initialAssessmentNotes[0];
  if (!existing) return { kind: "CREATE" };
  if (existing.status === "SIGNED") {
    return { kind: "REJECT", code: "INITIAL_NOTE_SIGNED_IMMUTABLE" };
  }
  if (existing.status !== "DRAFT" || existing.signedAtExists) {
    return { kind: "REJECT", code: "INITIAL_NOTE_STATE_INCONSISTENT" };
  }
  if (existing.authorEmployeeId !== input.employeeId) {
    return { kind: "REJECT", code: "INITIAL_NOTE_AUTHOR_MISMATCH" };
  }
  return { kind: "UPDATE", clinicalNoteId: existing.id };
}
