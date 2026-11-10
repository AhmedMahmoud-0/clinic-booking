import { PatientContactConsentError } from "./patient-contact-consent-errors";
import { patientManagementJson, toPatientManagementErrorResponse } from "./http";

export function toPatientContactConsentErrorResponse(error: unknown): Response {
  if (error instanceof PatientContactConsentError) {
    return patientManagementJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String(error.code);
    if (code === "P2002" || code === "P2034") {
      return patientManagementJson({ error: { code: "PATIENT_CONTACT_CONFLICT", message: "The patient contact profile changed concurrently or already contains this value. Refresh and try again." } }, 409);
    }
    if (code === "P2025") {
      return patientManagementJson({ error: { code: "PATIENT_CONTACT_RECORD_NOT_FOUND", message: "The requested patient contact record was not found." } }, 404);
    }
  }
  return toPatientManagementErrorResponse(error);
}
