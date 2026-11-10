export interface DoctorLabEncounterAccessInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string | null;
  encounterCompletedAtExists: boolean;
  encounterOriginIsConsistent: boolean;
}

export type DoctorLabOrderPolicyRejection =
  | "DOCTOR_WORKSPACE_ACCESS_REQUIRED"
  | "DOCTOR_PROFILE_REQUIRED"
  | "ENCOUNTER_NOT_FOUND"
  | "ENCOUNTER_NOT_EDITABLE"
  | "ENCOUNTER_SOURCE_INCONSISTENT"
  | "LAB_TEST_SELECTION_INVALID"
  | "LAB_TEST_NOT_AVAILABLE";

export type DoctorLabEncounterDecision =
  | { kind: "ALLOW"; doctorProfileId: string }
  | { kind: "REJECT"; code: DoctorLabOrderPolicyRejection };

export function decideDoctorLabEncounterAccess(
  input: DoctorLabEncounterAccessInput,
): DoctorLabEncounterDecision {
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

export function decideDoctorLabTestSelection(input: {
  requestedTestIds: readonly string[];
  availableTestIds: readonly string[];
}):
  | { kind: "ALLOW" }
  | { kind: "REJECT"; code: "LAB_TEST_SELECTION_INVALID" | "LAB_TEST_NOT_AVAILABLE" } {
  const requested = input.requestedTestIds;
  if (requested.length < 1 || requested.length > 20 || new Set(requested).size !== requested.length) {
    return { kind: "REJECT", code: "LAB_TEST_SELECTION_INVALID" };
  }
  const available = new Set(input.availableTestIds);
  if (requested.some((id) => !available.has(id))) {
    return { kind: "REJECT", code: "LAB_TEST_NOT_AVAILABLE" };
  }
  return { kind: "ALLOW" };
}
