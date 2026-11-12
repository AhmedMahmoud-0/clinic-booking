import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { mapRadiologyPhaseWorkflowError, RadiologyPhaseWorkflowError, radiologyPhaseRecordIdSchema, radiologyReportReviewRequestSchema, reviewRadiologyReport } from "../../../../../../server/radiology/radiology-phase-8i-j";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ reportId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapRadiologyPhaseWorkflowError(error);
  return mapped instanceof RadiologyPhaseWorkflowError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { reportId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.RADIOLOGY_REPORT_APPROVE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_REPORT_REVIEW", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send a review decision as JSON.", 415);
    const id = radiologyPhaseRecordIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = radiologyReportReviewRequestSchema.safeParse(body);
    if (!id.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_REPORT_REVIEW", message: "Choose APPROVED or CHANGES_REQUESTED and include a comment when requesting changes." } }, 400);
    const result = await reviewRadiologyReport(id.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, review: result }, 200);
  }, errorResponse)(request);
}
