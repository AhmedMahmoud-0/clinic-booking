export interface DoctorPrescriptionEncounterAccessInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string | null;
  encounterCompletedAtExists: boolean;
  encounterOriginIsConsistent: boolean;
}

export type DoctorPrescriptionPolicyRejection =
  | "DOCTOR_WORKSPACE_ACCESS_REQUIRED"
  | "DOCTOR_PROFILE_REQUIRED"
  | "ENCOUNTER_NOT_FOUND"
  | "ENCOUNTER_NOT_EDITABLE"
  | "ENCOUNTER_SOURCE_INCONSISTENT"
  | "PRESCRIPTION_DRAFT_ALREADY_EXISTS"
  | "PRESCRIPTION_NOT_FOUND"
  | "PRESCRIPTION_NOT_EDITABLE"
  | "PRESCRIPTION_AUTHOR_MISMATCH"
  | "PRESCRIPTION_STATE_INCONSISTENT";

export type DoctorPrescriptionEncounterDecision =
  | { kind: "ALLOW"; doctorProfileId: string }
  | { kind: "REJECT"; code: DoctorPrescriptionPolicyRejection };

export function decideDoctorPrescriptionEncounterAccess(
  input: DoctorPrescriptionEncounterAccessInput,
): DoctorPrescriptionEncounterDecision {
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
  return { kind: "ALLOW", doctorProfileId: input.doctorProfileId };
}

export function decideDoctorPrescriptionDraftCreation(input: { existingDraftCount: number }):
  | { kind: "CREATE" }
  | { kind: "REJECT"; code: "PRESCRIPTION_DRAFT_ALREADY_EXISTS" } {
  return input.existingDraftCount === 0
    ? { kind: "CREATE" }
    : { kind: "REJECT", code: "PRESCRIPTION_DRAFT_ALREADY_EXISTS" };
}

export function decideDoctorPrescriptionDraftMutation(input: {
  prescriptionExists: boolean;
  prescriptionStatus: string | null;
  prescribedByEmployeeId: string | null;
  actorEmployeeId: string;
  issuedAtExists: boolean;
}):
  | { kind: "UPDATE" }
  | { kind: "REJECT"; code: "PRESCRIPTION_NOT_FOUND" | "PRESCRIPTION_NOT_EDITABLE" | "PRESCRIPTION_AUTHOR_MISMATCH" | "PRESCRIPTION_STATE_INCONSISTENT" } {
  if (!input.prescriptionExists) return { kind: "REJECT", code: "PRESCRIPTION_NOT_FOUND" };
  if (input.prescriptionStatus !== "DRAFT") return { kind: "REJECT", code: "PRESCRIPTION_NOT_EDITABLE" };
  if (input.issuedAtExists) return { kind: "REJECT", code: "PRESCRIPTION_STATE_INCONSISTENT" };
  if (input.prescribedByEmployeeId !== input.actorEmployeeId) {
    return { kind: "REJECT", code: "PRESCRIPTION_AUTHOR_MISMATCH" };
  }
  return { kind: "UPDATE" };
}

export interface DoctorPrescriptionIssueInput {
  prescriptionExists: boolean;
  prescriptionStatus: string | null;
  prescribedByEmployeeId: string | null;
  actorEmployeeId: string;
  issuedAtExists: boolean;
  itemCount: number;
}

export type DoctorPrescriptionIssueDecision =
  | { kind: "ISSUE" }
  | {
      kind: "REJECT";
      code:
        | "PRESCRIPTION_NOT_FOUND"
        | "PRESCRIPTION_NOT_ISSUABLE"
        | "PRESCRIPTION_AUTHOR_MISMATCH"
        | "PRESCRIPTION_STATE_INCONSISTENT"
        | "PRESCRIPTION_ITEMS_INVALID";
    };

/** Only the original prescriber may issue a complete, still-draft prescription. */
export function decideDoctorPrescriptionIssue(
  input: DoctorPrescriptionIssueInput,
): DoctorPrescriptionIssueDecision {
  if (!input.prescriptionExists) {
    return { kind: "REJECT", code: "PRESCRIPTION_NOT_FOUND" };
  }
  if (input.prescriptionStatus !== "DRAFT") {
    return { kind: "REJECT", code: "PRESCRIPTION_NOT_ISSUABLE" };
  }
  if (input.issuedAtExists) {
    return { kind: "REJECT", code: "PRESCRIPTION_STATE_INCONSISTENT" };
  }
  if (input.prescribedByEmployeeId !== input.actorEmployeeId) {
    return { kind: "REJECT", code: "PRESCRIPTION_AUTHOR_MISMATCH" };
  }
  if (!Number.isInteger(input.itemCount) || input.itemCount < 1 || input.itemCount > 20) {
    return { kind: "REJECT", code: "PRESCRIPTION_ITEMS_INVALID" };
  }
  return { kind: "ISSUE" };
}
