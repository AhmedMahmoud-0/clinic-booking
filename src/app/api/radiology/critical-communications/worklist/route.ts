import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getRadiologyCriticalCommunicationWorklist, mapRadiologyPhaseWorkflowError, RadiologyPhaseWorkflowError } from "../../../../../server/radiology/radiology-phase-8i-j";

export const runtime = "nodejs";
function errorResponse(error: unknown): Response {
  const mapped = mapRadiologyPhaseWorkflowError(error);
  return mapped instanceof RadiologyPhaseWorkflowError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.RADIOLOGY_CRITICAL_COMMUNICATION_MANAGE, async (securedRequest, actor) => {
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_CRITICAL_QUERY", message: "Query parameters are not supported." } }, 400);
    const result = await getRadiologyCriticalCommunicationWorklist(actor.employeeId);
    return accountLinkJson({ success: true, ...result }, 200);
  }, errorResponse)(request);
}
