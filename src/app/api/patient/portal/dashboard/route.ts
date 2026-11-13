import { withPatientPortalRoute } from "../../../../../server/auth/authorization/route-guards";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getPatientDashboard } from "../../../../../server/patient-portal/read-model";

export const runtime = "nodejs";

export const GET = withPatientPortalRoute(
  async (_request, actor): Promise<Response> => {
    const dashboard = await getPatientDashboard(actor.patientId);
    if (!dashboard) {
      return accountLinkJson({ error: { code: "PATIENT_PROFILE_UNAVAILABLE", message: "Your patient profile is not available. Contact the clinic for assistance." } }, 403);
    }
    return accountLinkJson({ dashboard });
  },
  toAccountLinkErrorResponse,
);
