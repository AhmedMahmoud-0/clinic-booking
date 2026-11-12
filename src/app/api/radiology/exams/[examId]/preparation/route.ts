import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { mapRadiologyWorkflowError, RadiologyWorkflowError, recordRadiologyPreparation } from "../../../../../../server/radiology/radiology-workflow";
import { radiologyPreparationRequestSchema } from "../../../../../../server/radiology/radiology-scheduling-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ examId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapRadiologyWorkflowError(error);
  return mapped instanceof RadiologyWorkflowError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { examId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.RADIOLOGY_WORKFLOW_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_PREPARATION", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the preparation outcome as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = radiologyPreparationRequestSchema.safeParse(body);
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_PREPARATION", message: "Choose a preparation status and provide a reason when not required or an issue is reported." } }, 400);
    const result = await recordRadiologyPreparation(examId, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, preparation: result }, 200);
  }, errorResponse)(request);
}
