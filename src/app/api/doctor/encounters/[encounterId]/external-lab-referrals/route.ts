import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { createExternalLabReferral, ExternalLabError, listEncounterExternalLabReferrals, mapExternalLabError } from "../../../../../../server/laboratory/external-lab";
import { externalLabReferralRequestSchema } from "../../../../../../server/laboratory/external-lab-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ encounterId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapExternalLabError(error);
  return mapped instanceof ExternalLabError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ, async (securedRequest, actor) => {
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_EXTERNAL_LAB_REFERRAL_QUERY", message: "Query parameters are not supported." } }, 400);
    const result = await listEncounterExternalLabReferrals(encounterId, actor.employeeId);
    return accountLinkJson({ success: true, ...result }, 200);
  }, errorResponse)(request);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ORDER_CREATE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_EXTERNAL_LAB_REFERRAL", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send external laboratory referral and consent details as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = externalLabReferralRequestSchema.safeParse(body);
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_EXTERNAL_LAB_REFERRAL", message: "Provide a test, reason, external facility, and granted diagnostic data-sharing consent." } }, 400);
    const result = await createExternalLabReferral(encounterId, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, referral: result }, 201);
  }, errorResponse)(request);
}
