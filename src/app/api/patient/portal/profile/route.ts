import { withPatientPortalRoute } from "../../../../../server/auth/authorization/route-guards";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getPatientProfile } from "../../../../../server/patient-portal/read-model";

export const runtime = "nodejs";

/** Read only the authenticated patient's own clinic and account details. */
export const GET = withPatientPortalRoute(
  async (_request, actor): Promise<Response> => {
    const profile = await getPatientProfile(actor.patientId);
    if (!profile) {
      return accountLinkJson({ error: { code: "PATIENT_PROFILE_UNAVAILABLE", message: "Your patient profile is not available. Contact the clinic for assistance." } }, 403);
    }
    return accountLinkJson({ profile });
  },
  toAccountLinkErrorResponse,
);
