import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getRadiologyPregnancyReviewWorklist, mapRadiologyWorkflowError, RadiologyWorkflowError } from "../../../../../server/radiology/radiology-workflow";

export const runtime = "nodejs";
function errorResponse(error: unknown): Response {
  const mapped = mapRadiologyWorkflowError(error);
  return mapped instanceof RadiologyWorkflowError
    ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status)
    : toAccountLinkErrorResponse(mapped);
}
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.RADIOLOGY_REPORT_APPROVE, async (securedRequest, actor) => {
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_PREGNANCY_WORKLIST", message: "Query parameters are not supported." } }, 400);
    const result = await getRadiologyPregnancyReviewWorklist(actor.employeeId);
    return accountLinkJson({ success: true, ...result }, 200);
  }, errorResponse)(request);
}
