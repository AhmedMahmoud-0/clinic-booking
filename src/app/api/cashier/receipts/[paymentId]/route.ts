import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { BillingWorkflowError, getCashierPaymentReceipt } from "../../../../../server/billing/billing-phase-9a";
import { billingPhaseRecordIdSchema } from "../../../../../server/billing/billing-phase-9a-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ paymentId: string }> };

function errorResponse(error: unknown): Response {
  if (error instanceof BillingWorkflowError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { paymentId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.BILLING_READ, async (securedRequest) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") {
      return accountLinkJson({ error: { code: "INVALID_RECEIPT_QUERY", message: "Query parameters are not supported." } }, 400);
    }
    const parsed = billingPhaseRecordIdSchema.safeParse(rawId);
    if (!parsed.success) {
      return accountLinkJson({ error: { code: "INVALID_RECEIPT_ID", message: "The payment identifier is invalid." } }, 400);
    }
    const receipt = await getCashierPaymentReceipt(parsed.data);
    return accountLinkJson({ success: true, receipt });
  }, errorResponse)(request);
}
