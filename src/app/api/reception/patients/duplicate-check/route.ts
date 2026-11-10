import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { checkPatientDuplicates } from "../../../../../server/patient-management/patient-registration";
import { patientManagementJson, parsePatientManagementJson, toPatientManagementErrorResponse } from "../../../../../server/patient-management/http";
import { patientDuplicateCheckSchema } from "../../../../../server/patient-management/validation";

export const runtime = "nodejs";

/** Return a minimal demographic match list before the receptionist creates a patient record. */
export const POST = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.PATIENT_BASIC_MANAGE,
  async (request): Promise<Response> => {
    const input = await parsePatientManagementJson(request, patientDuplicateCheckSchema);
    const result = await checkPatientDuplicates(input);
    return patientManagementJson({ data: result });
  },
  toPatientManagementErrorResponse,
);
