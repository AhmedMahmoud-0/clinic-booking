import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import { patientManagementJson, parsePatientManagementJson, toPatientManagementErrorResponse } from "../../../../server/patient-management/http";
import { registerPatient } from "../../../../server/patient-management/patient-registration";
import { createPatientSchema } from "../../../../server/patient-management/validation";

export const runtime = "nodejs";

/** Register an existing-in-clinic person as a patient; only Reception has this permission. */
export const POST = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.PATIENT_BASIC_MANAGE,
  async (request, actor): Promise<Response> => {
    const input = await parsePatientManagementJson(request, createPatientSchema);
    const result = await registerPatient(input, actor.employeeId);
    return patientManagementJson({ data: result }, 201);
  },
  toPatientManagementErrorResponse,
);
