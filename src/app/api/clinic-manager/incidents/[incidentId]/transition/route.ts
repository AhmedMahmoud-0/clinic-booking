import { withEmployeePermissionRoute } from "@/server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";
import { AccountLinkError, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "@/server/auth/account-linking/common";
import { clinicManagerJson } from "@/server/clinic-manager/http";
import { ClinicManagerOperationsError, transitionClinicManagerIncident } from "@/server/clinic-manager/operations";
import { incidentTransitionSchema, managerRecordIdSchema } from "@/server/clinic-manager/operations-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ incidentId: string }> };

function errorResponse(error: unknown): Response {
  if (error instanceof ClinicManagerOperationsError) return clinicManagerJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { incidentId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.INCIDENT_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the incident status update as JSON.", 415);
    const id = managerRecordIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = incidentTransitionSchema.safeParse(body);
    if (!id.success || !parsed.success) return clinicManagerJson({ error: { code: "INVALID_INCIDENT_UPDATE", message: "Choose a valid status and provide resolution notes when resolving or closing." } }, 400);
    const incident = await transitionClinicManagerIncident(id.data, actor.employeeId, parsed.data);
    return clinicManagerJson({ success: true, incident });
  }, errorResponse)(request);
}
