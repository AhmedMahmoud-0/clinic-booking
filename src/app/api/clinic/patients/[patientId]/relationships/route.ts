import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { parsePatientManagementJson, patientManagementJson } from "../../../../../../server/patient-management/http";
import {
  createPatientRelationship,
  getPatientRelationships,
} from "../../../../../../server/patient-management/patient-relationships";
import { createPatientRelationshipSchema } from "../../../../../../server/patient-management/patient-relationship-validation";
import { toPatientRelationshipErrorResponse } from "../../../../../../server/patient-management/patient-relationship-http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ patientId: string }> };

/** Lists only relationships recorded from this patient's directed perspective. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { patientId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_READ,
    async (): Promise<Response> =>
      patientManagementJson({ data: await getPatientRelationships(patientId) }),
    toPatientRelationshipErrorResponse,
  )(request);
}

/** Creates a directed family link; it does not grant account or record access. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { patientId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parsePatientManagementJson(securedRequest, createPatientRelationshipSchema);
      const data = await createPatientRelationship(patientId, input, actor.employeeId);
      return patientManagementJson({ data, message: "Patient family relationship recorded." }, 201);
    },
    toPatientRelationshipErrorResponse,
  )(request);
}
