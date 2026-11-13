import { withEmployeePermissionRoute } from "@/server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";
import { AccountLinkError, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "@/server/auth/account-linking/common";
import { clinicManagerJson } from "@/server/clinic-manager/http";
import { ClinicManagerOperationsError, transitionClinicManagerComplaint } from "@/server/clinic-manager/operations";
import { complaintTransitionSchema, managerRecordIdSchema } from "@/server/clinic-manager/operations-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ complaintId: string }> };

function errorResponse(error: unknown): Response {
  if (error instanceof ClinicManagerOperationsError) return clinicManagerJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { complaintId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.COMPLAINT_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the complaint status update as JSON.", 415);
    const id = managerRecordIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = complaintTransitionSchema.safeParse(body);
    if (!id.success || !parsed.success) return clinicManagerJson({ error: { code: "INVALID_COMPLAINT_UPDATE", message: "Choose a valid status and provide a note when resolving, closing, or rejecting." } }, 400);
    const result = await transitionClinicManagerComplaint(id.data, actor.employeeId, parsed.data);
    return clinicManagerJson({ success: true, complaint: result });
  }, errorResponse)(request);
}
