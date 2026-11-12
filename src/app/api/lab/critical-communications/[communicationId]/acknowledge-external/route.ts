import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { acknowledgeLabCriticalCommunication, LabResultReviewError, mapLabResultReviewError } from "../../../../../../server/laboratory/lab-result-review";
import { labCriticalAcknowledgementRequestSchema, labResultReviewIdSchema } from "../../../../../../server/laboratory/lab-result-review-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ communicationId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapLabResultReviewError(error);
  return mapped instanceof LabResultReviewError
    ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status)
    : toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { communicationId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_EXTERNAL_LAB_CRITICAL_ACKNOWLEDGEMENT", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send external-provider read-back confirmation as JSON.", 415);
    const id = labResultReviewIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = labCriticalAcknowledgementRequestSchema.safeParse(body);
    if (!id.success || !parsed.success || !parsed.data.resolutionNotes?.trim()) {
      return accountLinkJson({ error: { code: "INVALID_EXTERNAL_LAB_CRITICAL_ACKNOWLEDGEMENT", message: "Explicit read-back confirmation and external-provider context are required." } }, 400);
    }
    const result = await acknowledgeLabCriticalCommunication(id.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, communication: result }, 200);
  }, errorResponse)(request);
}
