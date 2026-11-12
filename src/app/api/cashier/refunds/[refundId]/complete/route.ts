import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { BillingWorkflowError, completeInvoiceRefund } from "../../../../../../server/billing/billing-phase-9b";
import { billingPhaseRecordIdSchema, completeRefundSchema } from "../../../../../../server/billing/billing-phase-9b-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ refundId: string }> };
function errorResponse(error: unknown): Response {
  if (error instanceof BillingWorkflowError) return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { refundId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.REFUND_REQUEST, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_REFUND_COMPLETION", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the refund transaction reference as JSON when required.", 415);
    const id = billingPhaseRecordIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = completeRefundSchema.safeParse(body);
    if (!id.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_REFUND_COMPLETION", message: "Provide a valid refund transaction reference." } }, 400);
    const result = await completeInvoiceRefund(id.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, refund: result });
  }, errorResponse)(request);
}
