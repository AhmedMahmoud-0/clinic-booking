import { withPatientPortalRoute } from "../../../../server/auth/authorization/route-guards";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../server/auth/account-linking/common";
import { listPatientDelegationsForActor } from "../../../../server/auth/delegation/patient-delegation";

export const runtime = "nodejs";

/** Show only outgoing and incoming grants that involve the authenticated patient. */
export const GET = withPatientPortalRoute(
  async (_request, actor): Promise<Response> => {
    const result = await listPatientDelegationsForActor(actor.patientId);
    return accountLinkJson(result);
  },
  toAccountLinkErrorResponse,
);
