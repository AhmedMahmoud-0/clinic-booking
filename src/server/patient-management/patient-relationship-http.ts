import { PatientRelationshipError } from "./patient-relationship-errors";
import { patientManagementJson, toPatientManagementErrorResponse } from "./http";

export function toPatientRelationshipErrorResponse(error: unknown): Response {
  if (error instanceof PatientRelationshipError) {
    return patientManagementJson(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String(error.code);
    if (code === "P2002" || code === "P2034" || code === "P2004") {
      return patientManagementJson(
        {
          error: {
            code: "PATIENT_RELATIONSHIP_CONFLICT",
            message: "The family relationship changed concurrently or is already recorded. Refresh the patient relationships and try again.",
          },
        },
        409,
      );
    }
    if (code === "P2003" || code === "P2025") {
      return patientManagementJson(
        {
          error: {
            code: "PATIENT_RELATIONSHIP_REFERENCE_INVALID",
            message: "A referenced patient, employee, or document is no longer available.",
          },
        },
        409,
      );
    }
  }

  return toPatientManagementErrorResponse(error);
}
