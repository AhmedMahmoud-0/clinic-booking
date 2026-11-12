import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../server/auth/account-linking/common";
import { BillingWorkflowError, createBillingInvoiceDraft } from "../../../../server/billing/billing-phase-9b";
import { createBillingInvoiceDraftRequestSchema } from "../../../../server/billing/billing-phase-9b-validation";

export const runtime = "nodejs";
function errorResponse(error: unknown): Response {
  if (error instanceof BillingWorkflowError) return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}
export async function POST(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.INVOICE_MANAGE, async (securedRequest, actor) => {
    assertAccountLinkOrigin(securedRequest);
    if (new URL(securedRequest.url).search !== "") return accountLinkJson({ error: { code: "INVALID_BILLING_REQUEST", message: "Query parameters are not supported." } }, 400);
    if (!securedRequest.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send an encounterId or externalLabIntakeId as JSON.", 415);
    const body: unknown = await securedRequest.json().catch(() => null);
    const parsed = createBillingInvoiceDraftRequestSchema.safeParse(body);
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_BILLING_REQUEST", message: "Provide a valid billing source." } }, 400);
    const invoice = await createBillingInvoiceDraft(parsed.data, actor.employeeId);
    return accountLinkJson({ success: true, invoice }, 201);
  }, errorResponse)(request);
}
