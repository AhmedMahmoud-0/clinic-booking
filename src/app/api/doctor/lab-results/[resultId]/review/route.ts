import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { mapLabResultReviewError, LabResultReviewError, recordDoctorLabClinicalReview } from "../../../../../../server/laboratory/lab-result-review";
import { doctorLabClinicalReviewRequestSchema, labResultReviewIdSchema } from "../../../../../../server/laboratory/lab-result-review-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ resultId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapLabResultReviewError(error);
  if (mapped instanceof LabResultReviewError) return accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status);
  return toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { resultId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_DOCTOR_LAB_CLINICAL_REVIEW", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send a clinical review decision as JSON.", 415);
    const id = labResultReviewIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = doctorLabClinicalReviewRequestSchema.safeParse(body);
    if (!id.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_DOCTOR_LAB_CLINICAL_REVIEW", message: "Provide a review decision and notes when follow-up is required." } }, 400);
    const review = await recordDoctorLabClinicalReview(id.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, review }, 200);
  }, errorResponse)(request);
}
