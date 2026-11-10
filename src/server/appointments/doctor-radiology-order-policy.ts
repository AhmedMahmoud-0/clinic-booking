export interface DoctorRadiologyEncounterAccessInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string | null;
  encounterCompletedAtExists: boolean;
  encounterOriginIsConsistent: boolean;
}

export type DoctorRadiologyOrderPolicyRejection =
  | "DOCTOR_WORKSPACE_ACCESS_REQUIRED"
  | "DOCTOR_PROFILE_REQUIRED"
  | "ENCOUNTER_NOT_FOUND"
  | "ENCOUNTER_NOT_EDITABLE"
  | "ENCOUNTER_SOURCE_INCONSISTENT"
  | "RADIOLOGY_PROCEDURE_SELECTION_INVALID"
  | "RADIOLOGY_PROCEDURE_NOT_AVAILABLE"
  | "RADIOLOGY_XRAY_ASSESSMENT_REQUIRED"
  | "RADIOLOGY_ASSESSMENT_WITHOUT_XRAY"
  | "RADIOLOGY_ASSESSMENT_REASON_REQUIRED";

export type DoctorRadiologyEncounterDecision =
  | { kind: "ALLOW"; doctorProfileId: string }
  | { kind: "REJECT"; code: DoctorRadiologyOrderPolicyRejection };

export function decideDoctorRadiologyEncounterAccess(
  input: DoctorRadiologyEncounterAccessInput,
): DoctorRadiologyEncounterDecision {
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

export interface DoctorRadiologyProcedureSelectionInput {
  requestedProcedureIds: readonly string[];
  availableProcedures: readonly { id: string; modality: string }[];
}

export function decideDoctorRadiologyProcedureSelection(
  input: DoctorRadiologyProcedureSelectionInput,
):
  | { kind: "ALLOW"; hasDigitalXray: boolean }
  | { kind: "REJECT"; code: "RADIOLOGY_PROCEDURE_SELECTION_INVALID" | "RADIOLOGY_PROCEDURE_NOT_AVAILABLE" } {
  const requested = input.requestedProcedureIds;
  if (requested.length < 1 || requested.length > 10 || new Set(requested).size !== requested.length) {
    return { kind: "REJECT", code: "RADIOLOGY_PROCEDURE_SELECTION_INVALID" };
  }
  const byId = new Map(input.availableProcedures.map((procedure) => [procedure.id, procedure]));
  if (requested.some((id) => !byId.has(id))) {
    return { kind: "REJECT", code: "RADIOLOGY_PROCEDURE_NOT_AVAILABLE" };
  }
  return {
    kind: "ALLOW",
    hasDigitalXray: requested.some((id) => byId.get(id)?.modality === "DIGITAL_XRAY"),
  };
}

export function decideDoctorRadiologyPregnancyAssessment(input: {
  hasDigitalXray: boolean;
  assessment: string | null;
  notes: string | null;
}):
  | { kind: "ALLOW" }
  | {
      kind: "REJECT";
      code:
        | "RADIOLOGY_XRAY_ASSESSMENT_REQUIRED"
        | "RADIOLOGY_ASSESSMENT_WITHOUT_XRAY"
        | "RADIOLOGY_ASSESSMENT_REASON_REQUIRED";
    } {
  if (!input.hasDigitalXray) {
    return input.assessment === null && input.notes === null
      ? { kind: "ALLOW" }
      : { kind: "REJECT", code: "RADIOLOGY_ASSESSMENT_WITHOUT_XRAY" };
  }
  if (input.assessment === null) {
    return { kind: "REJECT", code: "RADIOLOGY_XRAY_ASSESSMENT_REQUIRED" };
  }
  if (input.assessment !== "SCREENING_REQUIRED" && input.assessment !== "NOT_INDICATED") {
    return { kind: "REJECT", code: "RADIOLOGY_XRAY_ASSESSMENT_REQUIRED" };
  }
  if (input.assessment === "NOT_INDICATED" && !input.notes?.trim()) {
    return { kind: "REJECT", code: "RADIOLOGY_ASSESSMENT_REASON_REQUIRED" };
  }
  return { kind: "ALLOW" };
}
