import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { BillingWorkflowError, getCashierInvoiceCandidates } from "../../../../../server/billing/billing-phase-9a";
import { invoiceCandidateQuerySchema } from "../../../../../server/billing/billing-phase-9a-validation";

export const runtime = "nodejs";

function errorResponse(error: unknown): Response {
  if (error instanceof BillingWorkflowError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.INVOICE_MANAGE, async (securedRequest) => {
    assertAccountLinkOrigin(securedRequest);
    const url = new URL(securedRequest.url);
    if ([...url.searchParams.keys()].some((key) => key !== "q")) {
      return accountLinkJson({ error: { code: "INVALID_BILLING_QUERY", message: "Only q is supported." } }, 400);
    }
    const parsed = invoiceCandidateQuerySchema.safeParse({
      ...(url.searchParams.has("q") ? { q: url.searchParams.get("q") } : {}),
    });
    if (!parsed.success) {
      return accountLinkJson({ error: { code: "INVALID_BILLING_QUERY", message: "The encounter search term is invalid." } }, 400);
    }
    const result = await getCashierInvoiceCandidates(parsed.data);
    return accountLinkJson({ success: true, ...result });
  }, errorResponse)(request);
}
