import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { mapRadiologyWorkflowError, RadiologyWorkflowError, recordRadiologyPregnancyScreening } from "../../../../../../server/radiology/radiology-workflow";
import { radiologyPregnancyScreeningRequestSchema } from "../../../../../../server/radiology/radiology-scheduling-validation";

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
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_PREGNANCY_SCREENING", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the exam-day screening response as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = radiologyPregnancyScreeningRequestSchema.safeParse(body);
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_PREGNANCY_SCREENING", message: "Provide a screening response and a reason for declined or not-applicable responses." } }, 400);
    const result = await recordRadiologyPregnancyScreening(examId, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, screening: result }, 201);
  }, errorResponse)(request);
}
