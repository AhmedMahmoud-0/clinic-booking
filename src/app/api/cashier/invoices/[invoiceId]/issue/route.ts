import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { BillingWorkflowError, issueBillingInvoice } from "../../../../../../server/billing/billing-phase-9b";
import { billingPhaseRecordIdSchema, emptyBillingActionRequestSchema } from "../../../../../../server/billing/billing-phase-9a-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ invoiceId: string }> };

function errorResponse(error: unknown): Response {
  if (error instanceof BillingWorkflowError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { invoiceId: rawId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.INVOICE_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") {
      return accountLinkJson({ error: { code: "INVALID_BILLING_REQUEST", message: "Query parameters are not supported." } }, 400);
    }
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send an empty JSON object to issue the invoice.", 415);
    }
    const id = billingPhaseRecordIdSchema.safeParse(rawId);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsedBody = emptyBillingActionRequestSchema.safeParse(body);
    if (!id.success || !parsedBody.success) {
      return accountLinkJson({ error: { code: "INVALID_BILLING_REQUEST", message: "The invoice issue request is invalid." } }, 400);
    }
    const invoice = await issueBillingInvoice(id.data, actor.employeeId);
    return accountLinkJson({ success: true, invoice });
  }, errorResponse)(request);
}
