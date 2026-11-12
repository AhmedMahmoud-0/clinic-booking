import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../server/auth/account-linking/common";
import { createExternalLabIntake, ExternalLabError, mapExternalLabError } from "../../../../server/laboratory/external-lab";
import { externalLabIntakeUnionSchema } from "../../../../server/laboratory/external-lab-validation";

export const runtime = "nodejs";
function errorResponse(error: unknown): Response {
  const mapped = mapExternalLabError(error);
  return mapped instanceof ExternalLabError
    ? accountLinkJson({ error: { code: mapped.code, message: mapped.message } }, mapped.status)
    : toAccountLinkErrorResponse(mapped);
}
export async function POST(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.PATIENT_BASIC_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_EXTERNAL_LAB_INTAKE", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send external laboratory intake details as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = externalLabIntakeUnionSchema.safeParse(body);
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_EXTERNAL_LAB_INTAKE", message: "Provide valid referring-provider details, a new or identity-verified patient, and one or more active laboratory tests." } }, 400);
    const result = await createExternalLabIntake(actor.employeeId, parsed.data);
    if (result.identityVerified === false) return accountLinkJson({ success: false, error: { code: "PATIENT_IDENTITY_NOT_VERIFIED", message: "The two identity elements did not match. No external laboratory intake was created." }, verificationId: result.verificationId }, 409);
    return accountLinkJson({ success: true, ...result }, 201);
  }, errorResponse)(request);
}
