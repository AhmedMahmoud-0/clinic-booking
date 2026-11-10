import { withEmployeePermissionRoute } from "../../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../../server/auth/authorization/types";
import { assertAccountLinkOrigin } from "../../../../../../../../server/auth/account-linking/common";
import { parsePatientManagementJson, patientManagementJson } from "../../../../../../../../server/patient-management/http";
import { deactivatePatientRelationship } from "../../../../../../../../server/patient-management/patient-relationships";
import { deactivatePatientRelationshipSchema } from "../../../../../../../../server/patient-management/patient-relationship-validation";
import { toPatientRelationshipErrorResponse } from "../../../../../../../../server/patient-management/patient-relationship-http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ patientId: string; relationshipId: string }> };

/** Soft-deactivates the relationship, clears guardianship, and revokes linked grants. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { patientId, relationshipId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      const input = await parsePatientManagementJson(securedRequest, deactivatePatientRelationshipSchema);
      const data = await deactivatePatientRelationship(patientId, relationshipId, input, actor.employeeId);
      return patientManagementJson({ data, message: "Patient family relationship deactivated." });
    },
    toPatientRelationshipErrorResponse,
  )(request);
}
