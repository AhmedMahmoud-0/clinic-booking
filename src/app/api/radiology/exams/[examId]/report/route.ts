import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { createRadiologyReportDraft, mapRadiologyPhaseWorkflowError, RadiologyPhaseWorkflowError, radiologyPhaseRecordIdSchema, radiologyReportDraftRequestSchema } from "../../../../../../server/radiology/radiology-phase-8i-j";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ examId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapRadiologyPhaseWorkflowError(error);
  return mapped instanceof RadiologyPhaseWorkflowError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { examId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.RADIOLOGY_REPORT_APPROVE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_REPORT_DRAFT", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the report draft as JSON.", 415);
    const id = radiologyPhaseRecordIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = radiologyReportDraftRequestSchema.safeParse(body);
    if (!id.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_REPORT_DRAFT", message: "Provide findings and impression; a critical reason is required for critical reports." } }, 400);
    const result = await createRadiologyReportDraft(id.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, report: result }, 201);
  }, errorResponse)(request);
}
