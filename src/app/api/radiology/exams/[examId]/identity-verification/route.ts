import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { mapRadiologyWorkflowError, RadiologyWorkflowError, verifyRadiologyExamIdentity } from "../../../../../../server/radiology/radiology-workflow";
import { radiologyIdentityVerificationRequestSchema } from "../../../../../../server/radiology/radiology-scheduling-validation";

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
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_IDENTITY_CHECK", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send two patient identity elements as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = radiologyIdentityVerificationRequestSchema.safeParse(body);
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_RADIOLOGY_IDENTITY_CHECK", message: "Two distinct identity elements are required." } }, 400);
    const result = await verifyRadiologyExamIdentity(examId, actor.employeeId, parsed.data);
    if (!result.identityVerified) return accountLinkJson({ success: false, error: { code: "PATIENT_IDENTITY_NOT_VERIFIED", message: "The two identity elements did not both match. The exam remains blocked." }, verificationId: result.verificationId }, 409);
    return accountLinkJson({ success: true, ...result }, 200);
  }, errorResponse)(request);
}
