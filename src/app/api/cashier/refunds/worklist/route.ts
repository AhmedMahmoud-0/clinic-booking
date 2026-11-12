import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getApprovedRefundExecutionWorklist } from "../../../../../server/billing/billing-phase-9b";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.REFUND_REQUEST, async (securedRequest) => {
    if (new URL(securedRequest.url).search !== "") {
      return accountLinkJson({ error: { code: "INVALID_REFUND_WORKLIST_QUERY", message: "Query parameters are not supported." } }, 400);
    }
    const result = await getApprovedRefundExecutionWorklist();
    return accountLinkJson({ success: true, ...result });
  }, toAccountLinkErrorResponse)(request);
}
