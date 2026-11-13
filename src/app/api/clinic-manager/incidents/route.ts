import { withEmployeePermissionRoute } from "@/server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";
import { AccountLinkError, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "@/server/auth/account-linking/common";
import { clinicManagerJson } from "@/server/clinic-manager/http";
import {
  ClinicManagerOperationsError,
  createClinicManagerIncident,
  getClinicManagerIncidents,
} from "@/server/clinic-manager/operations";
import { createIncidentSchema } from "@/server/clinic-manager/operations-validation";

export const runtime = "nodejs";

function errorResponse(error: unknown): Response {
  if (error instanceof ClinicManagerOperationsError) return clinicManagerJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}

export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.INCIDENT_MANAGE,
  async (): Promise<Response> => clinicManagerJson({ success: true, incidents: await getClinicManagerIncidents() }),
  errorResponse,
);

export async function POST(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.INCIDENT_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the incident report as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = createIncidentSchema.safeParse(body);
    if (!parsed.success) return clinicManagerJson({ error: { code: "INVALID_INCIDENT_REPORT", message: "Provide a category, severity, occurrence time, summary, and description." } }, 400);
    const incident = await createClinicManagerIncident(actor.employeeId, parsed.data);
    return clinicManagerJson({ success: true, incident }, 201);
  }, errorResponse)(request);
}
