import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  patientManagementJson,
  parsePatientManagementJson,
  toPatientManagementErrorResponse,
} from "../../../../../../server/patient-management/http";
import { verifyPatientIdentity } from "../../../../../../server/patient-management/patient-identity-verification";
import { patientIdentityVerificationSchema } from "../../../../../../server/patient-management/identity-verification-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ patientId: string }> };

/** Compare two identifiers against one existing patient profile and audit the outcome. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { patientId } = await context.params;

  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_IDENTITY_VERIFY,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parsePatientManagementJson(
        securedRequest,
        patientIdentityVerificationSchema,
      );
      const data = await verifyPatientIdentity(patientId, input, actor.employeeId);
      return patientManagementJson(
        {
          data,
          ...(data.result === "FAILED"
            ? {
                message:
                  "The two supplied identifiers did not match this patient record. Re-check the patient and escalate if needed.",
              }
            : { message: "Patient identity verified." }),
        },
        data.result === "VERIFIED" ? 200 : 409,
      );
    },
    toPatientManagementErrorResponse,
  )(request);
}
