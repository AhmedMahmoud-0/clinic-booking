import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { mapLabResultReviewError, getDoctorLabResult, LabResultReviewError } from "../../../../../server/laboratory/lab-result-review";
import { labResultReviewIdSchema } from "../../../../../server/laboratory/lab-result-review-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ resultId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapLabResultReviewError(error);
  if (mapped instanceof LabResultReviewError) return accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status);
  return toAccountLinkErrorResponse(mapped);
}
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { resultId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ, async (securedRequest, actor) => {
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_DOCTOR_LAB_RESULT", message: "Query parameters are not supported." } }, 400);
    const id = labResultReviewIdSchema.safeParse(rawId);
    if (!id.success) return accountLinkJson({ error: { code: "INVALID_DOCTOR_LAB_RESULT", message: "A valid result ID is required." } }, 400);
    const result = await getDoctorLabResult(id.data, actor.employeeId);
    return accountLinkJson({ success: true, result }, 200);
  }, errorResponse)(request);
}
