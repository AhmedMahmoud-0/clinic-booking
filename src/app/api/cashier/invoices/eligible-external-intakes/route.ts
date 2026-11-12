import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getExternalIntakeBillingCandidates } from "../../../../../server/billing/billing-phase-9b";
import { externalIntakeCandidateQuerySchema } from "../../../../../server/billing/billing-phase-9b-validation";

export const runtime = "nodejs";
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.BILLING_READ, async (securedRequest) => {
    const url = new URL(securedRequest.url);
    const parsed = externalIntakeCandidateQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return accountLinkJson({ error: { code: "INVALID_BILLING_QUERY", message: "Provide a valid patient search term." } }, 400);
    const result = await getExternalIntakeBillingCandidates(parsed.data);
    return accountLinkJson({ success: true, ...result });
  }, toAccountLinkErrorResponse)(request);
}
