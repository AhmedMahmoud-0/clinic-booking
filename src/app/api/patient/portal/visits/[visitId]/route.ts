import { withPatientPortalRoute } from "../../../../../../server/auth/authorization/route-guards";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { getPatientVisitDetails } from "../../../../../../server/patient-portal/read-model";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ visitId: string }> };

/** A visit is returned only when it is completed and belongs to the authenticated patient. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { visitId } = await context.params;
  return withPatientPortalRoute(
    async (_securedRequest, actor): Promise<Response> => {
      if (!visitId || visitId.length > 128) {
        return accountLinkJson({ error: { code: "VISIT_NOT_FOUND", message: "The visit was not found." } }, 404);
      }
      const visit = await getPatientVisitDetails(actor.patientId, visitId);
      if (!visit) {
        return accountLinkJson({ error: { code: "VISIT_NOT_FOUND", message: "The visit was not found." } }, 404);
      }
      return accountLinkJson({ visit });
    },
    toAccountLinkErrorResponse,
  )(request);
}
