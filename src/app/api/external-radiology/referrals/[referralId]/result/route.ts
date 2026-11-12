import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { externalRadiologyResultRequestSchema, mapRadiologyPhaseWorkflowError, RadiologyPhaseWorkflowError, radiologyPhaseRecordIdSchema, receiveExternalRadiologyResult } from "../../../../../../server/radiology/radiology-phase-8i-j";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ referralId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapRadiologyPhaseWorkflowError(error);
  return mapped instanceof RadiologyPhaseWorkflowError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { referralId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.RADIOLOGY_WORKFLOW_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_EXTERNAL_RADIOLOGY_RESULT", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the external result details as JSON.", 415);
    const id = radiologyPhaseRecordIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = externalRadiologyResultRequestSchema.safeParse(body);
    if (!id.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_EXTERNAL_RADIOLOGY_RESULT", message: "Provide external findings and impression." } }, 400);
    const result = await receiveExternalRadiologyResult(id.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, result }, 200);
  }, errorResponse)(request);
}
