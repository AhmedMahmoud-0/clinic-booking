import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { mapLabResultReviewError, getLabResultReviewWorklist, LabResultReviewError } from "../../../../../server/laboratory/lab-result-review";

export const runtime = "nodejs";
function errorResponse(error: unknown): Response {
  const mapped = mapLabResultReviewError(error);
  if (mapped instanceof LabResultReviewError) return accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status);
  return toAccountLinkErrorResponse(mapped);
}
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE, async (securedRequest, actor) => {
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_LAB_REVIEW_WORKLIST", message: "Query parameters are not supported." } }, 400);
    const result = await getLabResultReviewWorklist(actor.employeeId);
    return accountLinkJson({ success: true, ...result }, 200);
  }, errorResponse)(request);
}
