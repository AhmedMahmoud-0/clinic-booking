import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { mapLabResultReviewError, LabResultReviewError, recordLabCriticalCommunication } from "../../../../../../server/laboratory/lab-result-review";
import { labCriticalCommunicationRequestSchema, labResultReviewIdSchema } from "../../../../../../server/laboratory/lab-result-review-validation";

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
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_LAB_CRITICAL_COMMUNICATION", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send critical communication details as JSON.", 415);
    const id = labResultReviewIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = labCriticalCommunicationRequestSchema.safeParse(body);
    if (!id.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_LAB_CRITICAL_COMMUNICATION", message: "Provide a communication method and recipient name." } }, 400);
    const result = await recordLabCriticalCommunication(id.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, communication: result }, 201);
  }, errorResponse)(request);
}
