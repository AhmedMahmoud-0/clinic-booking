export interface DoctorDiagnosisEncounterPolicyInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string | null;
  encounterCompletedAtExists: boolean;
  encounterOriginIsConsistent: boolean;
}

export type DoctorDiagnosisPolicyRejection =
  | "DOCTOR_WORKSPACE_ACCESS_REQUIRED"
  | "DOCTOR_PROFILE_REQUIRED"
  | "ENCOUNTER_NOT_FOUND"
  | "ENCOUNTER_NOT_EDITABLE"
  | "ENCOUNTER_SOURCE_INCONSISTENT"
  | "DIAGNOSIS_NOT_AVAILABLE"
  | "DIAGNOSIS_ALREADY_RECORDED"
  | "ENCOUNTER_DIAGNOSIS_NOT_FOUND";

export type DoctorDiagnosisAccessDecision =
  | { kind: "ALLOW"; doctorProfileId: string }
  | { kind: "REJECT"; code: DoctorDiagnosisPolicyRejection };

/**
 * Pure policy for Doctor-owned diagnosis operations. Persistence, row locks,
 * transaction isolation, and primary-diagnosis uniqueness remain service duties.
 */
export function decideDoctorDiagnosisEncounterAccess(
  input: DoctorDiagnosisEncounterPolicyInput,
): DoctorDiagnosisAccessDecision {
  if (input.employeeStatus !== "ACTIVE" || !input.activeRoles.includes("DOCTOR")) {
    return { kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" };
  }
  if (!input.doctorProfileId) {
    return { kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" };
  }
  if (!input.encounterExists) {
    return { kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" };
  }
  // Conceal another Doctor's encounter as not found.
  if (input.encounterDoctorId !== input.doctorProfileId) {
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

export function decideDoctorDiagnosisCatalogUse(input: {
  diagnosisExists: boolean;
  diagnosisIsActive: boolean;
}): { kind: "ALLOW" } | { kind: "REJECT"; code: "DIAGNOSIS_NOT_AVAILABLE" } {
  if (!input.diagnosisExists || !input.diagnosisIsActive) {
    return { kind: "REJECT", code: "DIAGNOSIS_NOT_AVAILABLE" };
  }
  return { kind: "ALLOW" };
}

export function decideDoctorDiagnosisAdd(input: {
  alreadyRecorded: boolean;
  currentPrimaryExists: boolean;
  requestedPrimary: boolean;
}):
  | { kind: "REJECT"; code: "DIAGNOSIS_ALREADY_RECORDED" }
  | { kind: "CREATE"; isPrimary: boolean; demoteCurrentPrimary: boolean } {
  if (input.alreadyRecorded) {
    return { kind: "REJECT", code: "DIAGNOSIS_ALREADY_RECORDED" };
  }
  const isPrimary = input.requestedPrimary || !input.currentPrimaryExists;
  return {
    kind: "CREATE",
    isPrimary,
    demoteCurrentPrimary: isPrimary && input.currentPrimaryExists,
  };
}

export function decideDoctorDiagnosisPrimaryChange(input: {
  targetExists: boolean;
  targetIsPrimary: boolean;
}):
  | { kind: "REJECT"; code: "ENCOUNTER_DIAGNOSIS_NOT_FOUND" }
  | { kind: "UNCHANGED" }
  | { kind: "PROMOTE" } {
  if (!input.targetExists) {
    return { kind: "REJECT", code: "ENCOUNTER_DIAGNOSIS_NOT_FOUND" };
  }
  return input.targetIsPrimary ? { kind: "UNCHANGED" } : { kind: "PROMOTE" };
}
