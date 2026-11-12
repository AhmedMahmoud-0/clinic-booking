import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { ExternalLabError, mapExternalLabError, receiveExternalLabResult } from "../../../../../../server/laboratory/external-lab";
import { externalLabResultRequestSchema } from "../../../../../../server/laboratory/external-lab-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ referralId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapExternalLabError(error);
  return mapped instanceof ExternalLabError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { referralId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_EXTERNAL_LAB_RESULT", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the external laboratory result summary as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = externalLabResultRequestSchema.safeParse(body);
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_EXTERNAL_LAB_RESULT", message: "A non-empty result summary is required." } }, 400);
    const result = await receiveExternalLabResult(referralId, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, result }, 200);
  }, errorResponse)(request);
}
