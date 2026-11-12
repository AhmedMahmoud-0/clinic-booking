import { withEmployeePermissionRoute } from "../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../../server/auth/account-linking/common";
import { BillingWorkflowError, decideInvoiceRefund } from "../../../../../../../server/billing/billing-phase-9b";
import { billingPhaseRecordIdSchema, managerDecisionSchema } from "../../../../../../../server/billing/billing-phase-9b-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ refundId: string }> };
function errorResponse(error: unknown): Response {
  if (error instanceof BillingWorkflowError) return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { refundId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.REFUND_APPROVE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_REFUND_DECISION", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the refund decision as JSON.", 415);
    const id = billingPhaseRecordIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = managerDecisionSchema.safeParse(body);
    if (!id.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_REFUND_DECISION", message: "Choose approve or reject; rejection requires a reason." } }, 400);
    const result = await decideInvoiceRefund(id.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, decision: result });
  }, errorResponse)(request);
}
