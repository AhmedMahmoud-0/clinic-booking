import { withPatientPortalRoute } from "../../../../../server/auth/authorization/route-guards";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getPatientVisitHistory } from "../../../../../server/patient-portal/read-model";

export const runtime = "nodejs";

/** Only completed encounters for the authenticated patient are listed; clinical content is not returned here. */
export const GET = withPatientPortalRoute(
  async (_request, actor): Promise<Response> => {
    const visits = await getPatientVisitHistory(actor.patientId);
    return accountLinkJson({ visits });
  },
  toAccountLinkErrorResponse,
);
