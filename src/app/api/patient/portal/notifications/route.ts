import { withPatientPortalRoute } from "../../../../../server/auth/authorization/route-guards";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getPatientNotifications } from "../../../../../server/patient-portal/update76-read-model";

export const runtime = "nodejs";

export const GET = withPatientPortalRoute(
  async (_request, actor): Promise<Response> => {
    const notifications = await getPatientNotifications(actor.patientId);
    return accountLinkJson({ notifications });
  },
  toAccountLinkErrorResponse,
);
