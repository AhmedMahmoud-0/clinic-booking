import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { createExternalRadiologyReferral, listEncounterExternalRadiologyReferrals, mapRadiologyPhaseWorkflowError, RadiologyPhaseWorkflowError, externalRadiologyReferralRequestSchema, radiologyPhaseRecordIdSchema } from "../../../../../../server/radiology/radiology-phase-8i-j";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ encounterId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapRadiologyPhaseWorkflowError(error);
  return mapped instanceof RadiologyPhaseWorkflowError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ, async (securedRequest, actor) => {
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_EXTERNAL_RADIOLOGY_REFERRALS_QUERY", message: "Query parameters are not supported." } }, 400);
    const id = radiologyPhaseRecordIdSchema.safeParse(rawId);
    if (!id.success) return accountLinkJson({ error: { code: "INVALID_EXTERNAL_RADIOLOGY_REFERRALS_QUERY", message: "A valid Encounter ID is required." } }, 400);
    const result = await listEncounterExternalRadiologyReferrals(id.data, actor.employeeId);
    return accountLinkJson({ success: true, ...result }, 200);
  }, errorResponse)(request);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ORDER_CREATE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_EXTERNAL_RADIOLOGY_REFERRAL", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send referral and consent details as JSON.", 415);
    const id = radiologyPhaseRecordIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = externalRadiologyReferralRequestSchema.safeParse(body);
    if (!id.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_EXTERNAL_RADIOLOGY_REFERRAL", message: "Provide the requested procedure, reason, external facility, and granted consent details." } }, 400);
    const result = await createExternalRadiologyReferral(id.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, referral: result }, 201);
  }, errorResponse)(request);
}
