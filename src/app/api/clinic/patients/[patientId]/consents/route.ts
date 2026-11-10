import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { parsePatientManagementJson, patientManagementJson } from "../../../../../../server/patient-management/http";
import { getPatientConsentHistory, recordPatientConsent } from "../../../../../../server/patient-management/patient-consents";
import { patientConsentRecordSchema } from "../../../../../../server/patient-management/patient-contact-consent-validation";
import { toPatientContactConsentErrorResponse } from "../../../../../../server/patient-management/patient-contact-consent-http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ patientId: string }> };

/** Read-only timeline/current state; consent history is never updated or deleted. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { patientId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_CONSENT_READ,
    async (): Promise<Response> => patientManagementJson({ data: await getPatientConsentHistory(patientId) }),
    toPatientContactConsentErrorResponse,
  )(request);
}

/** Append a new consent/refusal/withdrawal event. There is deliberately no PATCH or DELETE route. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { patientId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_CONSENT_RECORD,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parsePatientManagementJson(securedRequest, patientConsentRecordSchema);
      const data = await recordPatientConsent(patientId, input, actor.employeeId);
      return patientManagementJson({ data, message: "Patient consent event recorded." }, 201);
    },
    toPatientContactConsentErrorResponse,
  )(request);
}
