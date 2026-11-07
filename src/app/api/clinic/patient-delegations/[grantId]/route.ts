import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import { updatePatientAccessGrant } from "../../../../../server/auth/delegation/patient-delegation";
import { updatePatientDelegationSchema } from "../../../../../server/auth/delegation/patient-delegation-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ grantId: string }> };

/** Replace scopes/expiry. Adult grants return to PENDING for fresh patient approval. */
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { grantId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_DELEGATION_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
      }

      const body: unknown = await securedRequest.json().catch(() => null);
      const parsed = updatePatientDelegationSchema.safeParse(body);
      if (!parsed.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_REQUEST",
            message: "The patient delegation update is invalid. Check the exact scopes, expiry, and reason.",
          },
        }, 400);
      }

      const result = await updatePatientAccessGrant(grantId, parsed.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result });
    },
    toAccountLinkErrorResponse,
  )(request);
}
