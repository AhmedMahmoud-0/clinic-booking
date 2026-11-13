import { withPatientPortalRoute } from "../../../../../server/auth/authorization/route-guards";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getPatientPortalRecords } from "../../../../../server/patient-portal/update76-read-model";

export const runtime = "nodejs";

/** Returns only completed visits, issued prescriptions, and released diagnostic results for the authenticated patient. */
export const GET = withPatientPortalRoute(
  async (_request, actor): Promise<Response> => {
    const records = await getPatientPortalRecords(actor.patientId);
    return accountLinkJson({ records });
  },
  toAccountLinkErrorResponse,
);
