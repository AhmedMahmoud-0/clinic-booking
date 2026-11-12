import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getDoctorRadiologyReport, mapRadiologyPhaseWorkflowError, RadiologyPhaseWorkflowError, radiologyPhaseRecordIdSchema } from "../../../../../server/radiology/radiology-phase-8i-j";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ reportId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapRadiologyPhaseWorkflowError(error);
  return mapped instanceof RadiologyPhaseWorkflowError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { reportId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ, async (securedRequest, actor) => {
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_DOCTOR_RADIOLOGY_REPORT", message: "Query parameters are not supported." } }, 400);
    const id = radiologyPhaseRecordIdSchema.safeParse(rawId);
    if (!id.success) return accountLinkJson({ error: { code: "INVALID_DOCTOR_RADIOLOGY_REPORT", message: "A valid report ID is required." } }, 400);
    const result = await getDoctorRadiologyReport(id.data, actor.employeeId);
    return accountLinkJson({ success: true, report: result }, 200);
  }, errorResponse)(request);
}
