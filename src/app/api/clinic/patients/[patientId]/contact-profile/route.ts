import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { parsePatientManagementJson, patientManagementJson } from "../../../../../../server/patient-management/http";
import { applyPatientContactProfileCommand, getPatientContactProfile } from "../../../../../../server/patient-management/patient-contact-profile";
import { patientContactProfileCommandSchema } from "../../../../../../server/patient-management/patient-contact-consent-validation";
import { toPatientContactConsentErrorResponse } from "../../../../../../server/patient-management/patient-contact-consent-http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ patientId: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { patientId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_CONTACT_READ,
    async (): Promise<Response> => patientManagementJson({ data: await getPatientContactProfile(patientId) }),
    toPatientContactConsentErrorResponse,
  )(_request);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { patientId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_CONTACT_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parsePatientManagementJson(securedRequest, patientContactProfileCommandSchema);
      const data = await applyPatientContactProfileCommand(patientId, input, actor.employeeId);
      return patientManagementJson({ data, message: "Patient contact profile updated." }, 201);
    },
    toPatientContactConsentErrorResponse,
  )(request);
}
