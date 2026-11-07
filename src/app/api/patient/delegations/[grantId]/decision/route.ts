import { withPatientPortalRoute } from "../../../../../../server/auth/authorization/route-guards";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { decidePatientAccessGrant } from "../../../../../../server/auth/delegation/patient-delegation";
import { patientDelegationDecisionSchema } from "../../../../../../server/auth/delegation/patient-delegation-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ grantId: string }> };

/** Only the subject adult patient can approve or reject a pending grant. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { grantId } = await context.params;
  return withPatientPortalRoute(
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
      }

      const body: unknown = await securedRequest.json().catch(() => null);
      const parsed = patientDelegationDecisionSchema.safeParse(body);
      if (!parsed.success) {
        return accountLinkJson({
          error: { code: "INVALID_REQUEST", message: "Choose APPROVE or REJECT for this delegation request." },
        }, 400);
      }

      const result = await decidePatientAccessGrant(grantId, parsed.data, actor.patientId);
      return accountLinkJson({ success: true, ...result });
    },
    toAccountLinkErrorResponse,
  )(request);
}
