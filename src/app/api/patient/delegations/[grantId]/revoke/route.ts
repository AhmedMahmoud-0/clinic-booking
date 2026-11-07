import { withPatientPortalRoute } from "../../../../../../server/auth/authorization/route-guards";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { revokePatientAccessGrantBySubject } from "../../../../../../server/auth/delegation/patient-delegation";
import { patientDelegationRevokeSchema } from "../../../../../../server/auth/delegation/patient-delegation-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ grantId: string }> };

/** Only the subject patient can revoke their own pending or active delegation. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { grantId } = await context.params;
  return withPatientPortalRoute(
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
      }

      const body: unknown = await securedRequest.json().catch(() => null);
      const parsed = patientDelegationRevokeSchema.safeParse(body);
      if (!parsed.success) {
        return accountLinkJson({
          error: { code: "INVALID_REQUEST", message: "A valid revocation reason is required." },
        }, 400);
      }

      await revokePatientAccessGrantBySubject(grantId, parsed.data.reason, actor.patientId);
      return accountLinkJson({ success: true, status: "REVOKED" });
    },
    toAccountLinkErrorResponse,
  )(request);
}
