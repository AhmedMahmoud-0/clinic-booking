import { withEmployeePermissionRoute } from "../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../../server/auth/account-linking/common";
import { convertDiagnosticPatientToFullRecord, ExternalLabError, mapExternalLabError } from "../../../../../../../server/laboratory/external-lab";
import { patientRecordConversionRequestSchema } from "../../../../../../../server/laboratory/external-lab-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ patientId: string }> };
function errorResponse(error: unknown): Response {
  const mapped = mapExternalLabError(error);
  return mapped instanceof ExternalLabError ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status) : toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { patientId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.PATIENT_BASIC_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_PATIENT_RECORD_CONVERSION", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the reason and two-element identity check as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = patientRecordConversionRequestSchema.safeParse(body);
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_PATIENT_RECORD_CONVERSION", message: "A reason and two distinct patient identity elements are required." } }, 400);
    const result = await convertDiagnosticPatientToFullRecord(patientId, actor.employeeId, parsed.data);
    if (!result.identityVerified) return accountLinkJson({ success: false, error: { code: "PATIENT_IDENTITY_NOT_VERIFIED", message: "The patient identity could not be verified. The diagnostic-only record was not converted." } }, 409);
    return accountLinkJson({ success: true, ...result }, 200);
  }, errorResponse)(request);
}
