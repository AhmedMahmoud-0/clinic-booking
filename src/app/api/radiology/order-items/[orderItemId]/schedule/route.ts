import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { mapRadiologyWorkflowError, RadiologyWorkflowError, scheduleRadiologyExam } from "../../../../../../server/radiology/radiology-workflow";
import { radiologyScheduleRequestSchema } from "../../../../../../server/radiology/radiology-scheduling-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ orderItemId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapRadiologyWorkflowError(error);
  return mapped instanceof RadiologyWorkflowError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { orderItemId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.RADIOLOGY_WORKFLOW_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_SCHEDULE", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the resource and scheduling time as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = radiologyScheduleRequestSchema.safeParse(body);
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_SCHEDULE", message: "A valid resource ID and timezone-aware start time are required." } }, 400);
    const result = await scheduleRadiologyExam(orderItemId, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, exam: result }, 201);
  }, errorResponse)(request);
}
