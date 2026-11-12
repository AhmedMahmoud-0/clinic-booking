import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { BillingWorkflowError, getCashierInvoiceWorklist } from "../../../../../server/billing/billing-phase-9a";
import { invoiceWorklistQuerySchema } from "../../../../../server/billing/billing-phase-9a-validation";

export const runtime = "nodejs";

function errorResponse(error: unknown): Response {
  if (error instanceof BillingWorkflowError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.BILLING_READ, async (securedRequest) => {
    assertAccountLinkOrigin(securedRequest);
    const url = new URL(securedRequest.url);
    const allowed = new Set(["status", "q"]);
    if ([...url.searchParams.keys()].some((key) => !allowed.has(key))) {
      return accountLinkJson({ error: { code: "INVALID_BILLING_QUERY", message: "Only status and q query parameters are supported." } }, 400);
    }
    const parsed = invoiceWorklistQuerySchema.safeParse({
      ...(url.searchParams.has("status") ? { status: url.searchParams.get("status") } : {}),
      ...(url.searchParams.has("q") ? { q: url.searchParams.get("q") } : {}),
    });
    if (!parsed.success) {
      return accountLinkJson({ error: { code: "INVALID_BILLING_QUERY", message: "The invoice worklist filters are invalid." } }, 400);
    }
    const result = await getCashierInvoiceWorklist(parsed.data);
    return accountLinkJson({ success: true, ...result });
  }, errorResponse)(request);
}
