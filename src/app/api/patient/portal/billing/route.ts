import { withPatientPortalRoute } from "../../../../../server/auth/authorization/route-guards";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getPatientBilling } from "../../../../../server/patient-portal/update76-read-model";

export const runtime = "nodejs";

/** Invoice and completed-payment records are always scoped to the authenticated patient identity. */
export const GET = withPatientPortalRoute(
  async (_request, actor): Promise<Response> => {
    const invoices = await getPatientBilling(actor.patientId);
    return accountLinkJson({ invoices });
  },
  toAccountLinkErrorResponse,
);
