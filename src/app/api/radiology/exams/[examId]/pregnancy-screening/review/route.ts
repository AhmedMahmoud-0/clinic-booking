import { withEmployeePermissionRoute } from "../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../../server/auth/account-linking/common";
import { mapRadiologyWorkflowError, RadiologyWorkflowError, reviewRadiologyPregnancyScreening } from "../../../../../../../server/radiology/radiology-workflow";
import { radiologyPregnancyReviewRequestSchema } from "../../../../../../../server/radiology/radiology-scheduling-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ examId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapRadiologyWorkflowError(error);
  return mapped instanceof RadiologyWorkflowError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { examId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.RADIOLOGY_REPORT_APPROVE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_PREGNANCY_REVIEW", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the Radiologist decision and notes as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = radiologyPregnancyReviewRequestSchema.safeParse(body);
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_PREGNANCY_REVIEW", message: "Choose a decision and provide the clinical review notes." } }, 400);
    const result = await reviewRadiologyPregnancyScreening(examId, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, review: result }, 200);
  }, errorResponse)(request);
}
