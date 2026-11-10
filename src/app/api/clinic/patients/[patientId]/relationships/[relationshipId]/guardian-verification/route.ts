import { withEmployeePermissionRoute } from "../../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../../server/auth/authorization/types";
import { assertAccountLinkOrigin } from "../../../../../../../../server/auth/account-linking/common";
import { parsePatientManagementJson, patientManagementJson } from "../../../../../../../../server/patient-management/http";
import {
  revokePatientLegalGuardianVerification,
  verifyPatientLegalGuardian,
} from "../../../../../../../../server/patient-management/patient-relationships";
import { verifyPatientLegalGuardianSchema } from "../../../../../../../../server/patient-management/patient-relationship-validation";
import { toPatientRelationshipErrorResponse } from "../../../../../../../../server/patient-management/patient-relationship-http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ patientId: string; relationshipId: string }> };

/** Verifies guardianship only after checking a linked private patient document. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { patientId, relationshipId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parsePatientManagementJson(securedRequest, verifyPatientLegalGuardianSchema);
      const data = await verifyPatientLegalGuardian(patientId, relationshipId, input, actor.employeeId);
      return patientManagementJson({ data, message: "Legal-guardian verification recorded." }, 201);
    },
    toPatientRelationshipErrorResponse,
  )(request);
}

/** Revokes the legal-guardian designation and its linked patient-access grants. */
export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const { patientId, relationshipId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      const data = await revokePatientLegalGuardianVerification(patientId, relationshipId, actor.employeeId);
      return patientManagementJson({ data, message: "Legal-guardian verification revoked." });
    },
    toPatientRelationshipErrorResponse,
  )(request);
}
