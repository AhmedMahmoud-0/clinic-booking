import { withEmployeePermissionRoute } from "../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../server/auth/authorization/types";
import { assertAccountLinkOrigin } from "../../../../../../../server/auth/account-linking/common";
import { parsePatientManagementJson, patientManagementJson } from "../../../../../../../server/patient-management/http";
import { correctPatientRelationship } from "../../../../../../../server/patient-management/patient-relationships";
import { correctPatientRelationshipSchema } from "../../../../../../../server/patient-management/patient-relationship-validation";
import { toPatientRelationshipErrorResponse } from "../../../../../../../server/patient-management/patient-relationship-http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ patientId: string; relationshipId: string }> };

/** Corrects a directed relationship type and appends an audit event. */
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { patientId, relationshipId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      const input = await parsePatientManagementJson(securedRequest, correctPatientRelationshipSchema);
      const data = await correctPatientRelationship(patientId, relationshipId, input, actor.employeeId);
      return patientManagementJson({ data, message: "Patient family relationship corrected." });
    },
    toPatientRelationshipErrorResponse,
  )(request);
}
