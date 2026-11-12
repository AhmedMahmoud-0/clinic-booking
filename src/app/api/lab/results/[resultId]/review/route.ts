import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { mapLabResultReviewError, LabResultReviewError, reviewLabResult } from "../../../../../../server/laboratory/lab-result-review";
import { labResultReviewIdSchema, labResultReviewRequestSchema } from "../../../../../../server/laboratory/lab-result-review-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ resultId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapLabResultReviewError(error);
  if (mapped instanceof LabResultReviewError) return accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status);
  return toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { resultId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_LAB_RESULT_REVIEW", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send a review decision as JSON.", 415);
    const id = labResultReviewIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = labResultReviewRequestSchema.safeParse(body);
    if (!id.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_LAB_RESULT_REVIEW", message: "Provide APPROVED or REJECTED and a required comment when rejecting." } }, 400);
    const result = await reviewLabResult(id.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, result }, 200);
  }, errorResponse)(request);
}
